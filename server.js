const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const db = new sqlite3.Database('./db/dictionary.db');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'www')));

// API to get levels
app.get('/api/levels', (req, res) => {
    db.all('SELECT * FROM Levels', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// API to get words for a level
app.get('/api/words/:levelId', (req, res) => {
    const levelId = req.params.levelId;
    const userId = req.query.userId;

    const query = `
        SELECT w.*, COALESCE(u.knows, 0) AS knows
        FROM Words w
        LEFT JOIN UserWordStatus u ON w.id = u.word_id AND u.user_id = ?
        WHERE w.level_id = ?
    `;

    db.all(query, [userId, levelId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});


// API to get translations for a word
app.get('/api/translations/:wordId', (req, res) => {
    const wordId = req.params.wordId;
    db.all('SELECT * FROM Translations WHERE word_id = ?', [wordId], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// API to update or add translation
app.post('/api/translations', (req, res) => {
    const { id, word_id, translation, usage_example, example_translation } = req.body;
    if (id) {
        db.run('UPDATE Translations SET translation = ?, usage_example = ?, example_translation = ? WHERE id = ?', [translation, usage_example, example_translation, id], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ changes: this.changes });
        });
    } else {
        db.run('INSERT INTO Translations (word_id, translation, usage_example, example_translation) VALUES (?, ?, ?, ?)', [word_id, translation, usage_example, example_translation], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id: this.lastID });
        });
    }
});

// API to update user word status
app.post('/api/user-word-status', (req, res) => {
    const { userId, wordId, knows } = req.body;
    const query = `
        INSERT INTO UserWordStatus (user_id, word_id, knows)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, word_id) DO UPDATE SET knows = excluded.knows
    `;
    db.run(query, [userId, wordId, knows], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true });
    });
});

// API to delete a translation
app.delete('/api/translations/:id', (req, res) => {
    const translationId = req.params.id;
    db.run('DELETE FROM Translations WHERE id = ?', [translationId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ changes: this.changes });
    });
});

// API to delete a word
app.delete('/api/words/:wordId', (req, res) => {
    const wordId = req.params.wordId;
    db.run('DELETE FROM Words WHERE id = ?', [wordId], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true });
    });
});

// API для добавления нового слова и перевода
app.post('/api/words', (req, res) => {
    const { level_id, word, translation, usage_example, example_translation } = req.body;

    db.run('INSERT INTO Words (level_id, word) VALUES (?, ?)', [level_id, word], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        const wordId = this.lastID;

        db.run('INSERT INTO Translations (word_id, translation, usage_example, example_translation) VALUES (?, ?, ?, ?)', [wordId, translation, usage_example, example_translation], function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true });
        });
    });
});

// API для получения слов для обучения
// API для получения слов для обучения
app.get('/api/learn/:levelId', (req, res) => {
    const levelId = req.params.levelId;
    const userId = req.query.userId;
    const filter = req.query.filter;
    const limit = parseInt(req.query.limit, 10) || 0; // Получаем параметр limit из запроса

    let query = `
        SELECT w.id AS word_id, w.word, t.translation, t.usage_example, COALESCE(u.knows, 0) AS knows
        FROM Words w
        LEFT JOIN Translations t ON w.id = t.word_id
        LEFT JOIN UserWordStatus u ON w.id = u.word_id AND u.user_id = ?
        WHERE w.level_id = ?
    `;

    if (filter === 'unlearned') {
        query += ' AND COALESCE(u.knows, 0) = 0';
    }

    query += ' ORDER BY RANDOM()'; // Перемешиваем все слова

    if (limit > 0) {
        query += ' LIMIT ?'; // Применяем ограничение по количеству слов
    }

    db.all(query, [userId, levelId, limit], (err, rows) => {
        if (err) {
            console.error('Database query error:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        console.log('Returning learning words with translations:', rows);
        res.json(rows);
    });
});

// API для сохранения результатов обучения
app.post('/api/save-learning-results', (req, res) => {
    const { learning_date, time_spent, level_id, correct_answers, incorrect_answers } = req.body;

    db.run(`
        INSERT INTO LearningResults (learning_date, time_spent, level_id, correct_answers, incorrect_answers)
        VALUES (?, ?, ?, ?, ?)
    `, [learning_date, time_spent, level_id, correct_answers, incorrect_answers], function(err) {
        if (err) {
            console.error('Error saving learning results:', err);
            res.status(500).json({ error: 'Failed to save learning results' });
            return;
        }
        res.json({ success: true });
    });
});

app.get('/api/get-learning-results', (req, res) => {
    const query = `
        SELECT lr.learning_date, lr.time_spent, l.name as level_name, lr.correct_answers, lr.incorrect_answers
        FROM LearningResults lr
        JOIN Levels l ON lr.level_id = l.id
        ORDER BY lr.learning_date DESC
    `;

    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Error fetching learning results:', err);
            res.status(500).json({ error: 'Failed to fetch learning results' });
            return;
        }
        res.json(rows);
    });
});

// Маршрут для поиска слов
app.get('/api/search', (req, res) => {
    const query = req.query.query;

    if (!query) {
        return res.status(400).json({ error: 'Параметр запроса не указан' });
    }

    // Запрос, объединяющий таблицы Words и Translations
    const sql = `
        SELECT Words.word, Translations.translation, Translations.usage_example
        FROM Words
        LEFT JOIN Translations ON Words.id = Translations.word_id
        WHERE Words.word LIKE ? OR Translations.translation LIKE ?
    `;
    const params = [`%${query}%`, `%${query}%`];

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Ошибка выполнения поиска' });
        }
        res.json(rows);
    });
});


app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});
