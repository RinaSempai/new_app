document.addEventListener('DOMContentLoaded', () => {
    const startLearnButton = document.getElementById('start-learn');
    const learningModal = document.getElementById('learning-modal');
    const closeLearningButton = document.querySelector('.close-learning-button');
    const learningLevelSelect = document.getElementById('learning-level');
    const learningFilterSelect = document.getElementById('learning-filter');
    const wordQuantitySelect = document.getElementById('word-quantity'); // Новый элемент выбора количества слов
    const startTrainingButton = document.getElementById('start-training');
    const trainingModal = document.getElementById('training-modal');
    const closeTrainingButton = document.querySelector('.close-training-button');
    const trainingContainer = document.getElementById('training-container');
    const timerDisplay = document.getElementById('timer'); // Элемент секундомера
    let wordsToLearn = [];
    let currentWordIndex = 0;
    let correctAnswers = 0;
    let totalQuestions = 0;
    let timerInterval;
    let secondsElapsed = 0;
    let incorrectAnswers = 0; // Инициализируем переменную для неправильных ответов

    // Open the learning modal
    startLearnButton.addEventListener('click', () => {
        loadLevelsIntoLearningSelect();
        learningModal.style.display = 'flex';
    });

    // Close the learning modal
    closeLearningButton.addEventListener('click', () => {
        learningModal.style.display = 'none';
    });

    // Close the training modal
    closeTrainingButton.addEventListener('click', () => {
        trainingModal.style.display = 'none';
        clearInterval(timerInterval); // Останавливаем секундомер
    });

    // Load levels into the learning select dropdown
    function loadLevelsIntoLearningSelect() {
        fetch('/api/levels')
            .then(response => response.json())
            .then(levels => {
                learningLevelSelect.innerHTML = '';
                levels.forEach(level => {
                    const option = document.createElement('option');
                    option.value = level.id;
                    option.textContent = level.name;
                    learningLevelSelect.appendChild(option);
                });
            })
            .catch(err => console.error('Failed to load levels:', err));
    }

    // Start training
    startTrainingButton.addEventListener('click', () => {
        const selectedLevelId = learningLevelSelect.value;
        const filter = learningFilterSelect.value;
        const limit = wordQuantitySelect.value; // Получаем выбранное количество слов
        startTraining(selectedLevelId, filter, limit);
    });

    // Start training process
    function startTraining(levelId, filter, limit) {
        fetch(`/api/learn/${levelId}?userId=1&filter=${filter}&limit=${limit}`)
            .then(response => response.json())
            .then(words => {
                console.log('Words loaded for learning:', words);
                wordsToLearn = shuffleArray(words); // Перемешиваем слова
                currentWordIndex = 0;
                correctAnswers = 0;
                incorrectAnswers = 0; // Сброс неверных ответов
                totalQuestions = wordsToLearn.length;

                if (totalQuestions > 0) {
                    learningModal.style.display = 'none';
                    trainingModal.style.display = 'flex';
                    secondsElapsed = 0; // Сброс времени
                    updateTimerDisplay();
                    timerInterval = setInterval(updateTimer, 1000); // Запуск секундомера
                    showQuestion(wordsToLearn[currentWordIndex]);
                } else {
                    alert('Нет слов для обучения');
                }
            })
            .catch(err => console.error('Failed to load words for learning:', err));
    }

    // Перемешивание массива слов
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]]; // Swap elements
        }
        return array;
    }

    // Show question
    function showQuestion(word) {
        if (!word) {
            console.error('No word data to display');
            return;
        }
    
        console.log('Displaying word:', word);
        if (!trainingContainer) {
            console.error('Training container element not found');
            return;
        }
    
        // Очищаем контейнер и добавляем новый вопрос
        trainingContainer.innerHTML = `
            <h3>Переведите слово:</h3>
            <p>${word.translation || 'Перевод не найден'}</p>
            <input type="text" id="user-answer" placeholder="Введите перевод слова">
            <button id="submit-answer">Проверить</button>
            <div id="feedback"></div> <!-- Создаем элемент для обратной связи -->
        `;
    
        document.getElementById('submit-answer').addEventListener('click', () => {
            checkAnswer(word);
        });
    }    

    // Save learning results to the database
    function saveLearningResults(levelId, timeSpent, correctAnswers, incorrectAnswers) {
        const learningDate = new Date().toISOString().split('T')[0]; // Форматируем дату в ISO 8601

        fetch('/api/save-learning-results', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                learning_date: learningDate,
                time_spent: timeSpent,
                level_id: levelId,
                correct_answers: correctAnswers,
                incorrect_answers: incorrectAnswers
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Learning results saved:', data);
        })
        .catch(error => {
            console.error('Error saving learning results:', error);
        });
    }

    // Обновите конец функции checkAnswer
    function checkAnswer(word) {
        const userAnswer = document.getElementById('user-answer').value.trim();
        const feedbackDiv = document.getElementById('feedback');
        const answerInput = document.getElementById('user-answer');
        const submitButton = document.getElementById('submit-answer');
        
        console.log(`User answer: ${userAnswer}, Correct answer: ${word.translation}`);
        
        // Делаем поле ввода и кнопку неактивными
        answerInput.disabled = true;
        submitButton.disabled = true;
        
        if (userAnswer.toLowerCase() === word.word.toLowerCase()) {
            correctAnswers++;
            feedbackDiv.innerHTML = `<p style="color: green;">Правильно! ${word.usage_example || 'Нет примера использования'}</p>`;
        } else {
            incorrectAnswers++; // Увеличиваем количество неправильных ответов
            feedbackDiv.innerHTML = `<p style="color: red;">Неправильно. Правильный перевод: ${word.word}</p>`;
        }
        
        wordsToLearn.splice(currentWordIndex, 1); // Удаляем текущее слово из массива
        totalQuestions--; // Уменьшаем общее количество вопросов
        currentWordIndex = Math.min(currentWordIndex, totalQuestions - 1); // Обеспечиваем, что индекс не выходит за границы
    
        if (totalQuestions > 0) {
            setTimeout(() => {
                showQuestion(wordsToLearn[currentWordIndex]);
            }, 3000); // Пауза в 3 секунды перед показом следующего вопроса
        } else {
            setTimeout(() => {
                // Очищаем контейнер и показываем только результат обучения
                trainingContainer.innerHTML = `<p>Обучение завершено! Верных ответов: ${correctAnswers}, Неверных ответов: ${incorrectAnswers}</p>`;
                clearInterval(timerInterval); // Останавливаем секундомер
                
                // Сохраняем результаты
                saveLearningResults(
                    learningLevelSelect.value, // ID уровня
                    secondsElapsed, // Время в секундах
                    correctAnswers, // Количество верных ответов
                    incorrectAnswers // Количество неверных ответов
                );
                
                setTimeout(() => {
                    trainingModal.style.display = 'none';
                }, 7000); // Закрытие модального окна через 7 секунд после завершения обучения
            }, 3000);
        }
    }    

    // Обновление секундомера
    function updateTimer() {
        secondsElapsed++;
        updateTimerDisplay();
    }

    // Отображение секундомера
    function updateTimerDisplay() {
        const minutes = Math.floor(secondsElapsed / 60);
        const seconds = secondsElapsed % 60;
        timerDisplay.textContent = `Время: ${formatTime(minutes)}:${formatTime(seconds)}`;
    }

    // Форматирование времени
    function formatTime(value) {
        return value.toString().padStart(2, '0');
    }
});
