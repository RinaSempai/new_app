document.addEventListener('DOMContentLoaded', () => {
    const userId = 1; // Example user ID
    let words = [];
    let currentPage = 1;
    const wordsPerPage = 10;
    const wordList = document.getElementById('word-list');
    const pagination = document.getElementById('pagination');
    const wordModal = document.getElementById('word-modal');
    const editModal = document.getElementById('edit-modal');
    const closeButton = document.querySelector('.close-button');
    const closeEditButton = document.querySelector('.close-edit-button');
    const translationsContainer = document.getElementById('translations-container');
    const addTranslationButton = document.getElementById('add-translation');
    const saveEditButton = document.getElementById('save-edit');
    let currentWord = null;
    let editIndex = -1;
    let currentLevelId = null; // Initialize currentLevelId

    const addNewWordButton = document.getElementById('add-new-word');
    const newWordModal = document.getElementById('new-word-modal');
    const closeNewWordButton = document.querySelector('.close-new-word-button');
    const saveNewWordButton = document.getElementById('save-new-word');
    const newWordLevelSelect = document.getElementById('new-word-level');

    // Open the new word modal
    addNewWordButton.addEventListener('click', () => {
        loadLevelsIntoSelect();
        newWordModal.style.display = 'flex';
    });

    // Close the new word modal
    closeNewWordButton.addEventListener('click', () => {
        newWordModal.style.display = 'none';
    });

    // Save a new word
    saveNewWordButton.addEventListener('click', () => {
        const newWord = document.getElementById('new-word').value;
        const newTranslation = document.getElementById('new-translation').value;
        const newUsage = document.getElementById('new-usage').value;
        const newExampleTranslation = document.getElementById('new-example-translation').value;
        const selectedLevelId = newWordLevelSelect.value;

        const newWordData = {
            level_id: selectedLevelId,
            word: newWord,
            translation: newTranslation,
            usage_example: newUsage,
            example_translation: newExampleTranslation
        };

        fetch('/api/words', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newWordData)
        })
        .then(response => response.json())
        .then(() => {
            newWordModal.style.display = 'none';
            loadWords(selectedLevelId); // Reload words after adding a new word
        })
        .catch(err => console.error('Failed to save new word:', err));
    });

    // Load levels into the select dropdown
    function loadLevelsIntoSelect() {
        fetch('/api/levels')
            .then(response => response.json())
            .then(levels => {
                newWordLevelSelect.innerHTML = '';
                levels.forEach(level => {
                    const option = document.createElement('option');
                    option.value = level.id;
                    option.textContent = level.name;
                    newWordLevelSelect.appendChild(option);
                });
            })
            .catch(err => console.error('Failed to load levels:', err));
    }

    // Load levels and initialize the page
    function loadLevels() {
        fetch('/api/levels')
            .then(response => response.json())
            .then(levels => {
                console.log('Loaded levels:', levels); // Debugging
                const levelMenu = document.getElementById('level-menu');
                levels.forEach(level => {
                    const levelItem = document.createElement('li');
                    const levelLink = document.createElement('a');
                    levelLink.href = '#';
                    levelLink.textContent = level.name;
                    levelLink.setAttribute('data-level', level.id);
                    levelLink.addEventListener('click', (event) => {
                        event.preventDefault();
                        currentLevelId = level.id; // Update currentLevelId
                        loadWords(level.id);
                    });
                    levelItem.appendChild(levelLink);
                    levelMenu.appendChild(levelItem);
                });
                // Load default level
                if (levels.length > 0) {
                    currentLevelId = levels[0].id; // Set default level
                    loadWords(levels[0].id);
                }
            })
            .catch(err => console.error('Failed to load levels:', err));
    }

    // Load words for a level
    function loadWords(levelId) {
        fetch(`/api/words/${levelId}?userId=${userId}`)
            .then(response => response.json())
            .then(data => {
                words = data;
                renderWords();
                renderPagination();
            })
            .catch(err => console.error('Failed to load words:', err));
    }

    // Render words to the page
    function renderWords() {
        wordList.innerHTML = '';
        const start = (currentPage - 1) * wordsPerPage;
        const end = start + wordsPerPage;
        const paginatedWords = words.slice(start, end);

        paginatedWords.forEach(word => {
            const wordItem = document.createElement('div');
            wordItem.className = 'word-item';
            wordItem.innerHTML = `
                <span>${word.word}</span>
                <input type="checkbox" class="word-checkbox" data-word-id="${word.id}" ${word.knows ? 'checked' : ''}>
                <button class="delete-word-button">Удалить</button>
            `;

            // Update word status on checkbox change
            wordItem.querySelector('.word-checkbox').addEventListener('change', (event) => {
                updateWordStatus(word.id, event.target.checked ? 1 : 0);
            });

            // Delete word on button click
            wordItem.querySelector('.delete-word-button').addEventListener('click', () => {
                deleteWord(word.id);
            });

            // Show word details on click (except when clicking delete button)
            wordItem.addEventListener('click', (event) => {
                if (!event.target.classList.contains('word-checkbox') && !event.target.classList.contains('delete-word-button')) {
                    showWordDetails(word);
                }
            });

            wordList.appendChild(wordItem);
        });
    }

    // Function to delete a word
    function deleteWord(wordId) {
        // Ask for confirmation before deleting
        const confirmation = confirm('Вы действительно хотите удалить это слово?');
        if (!confirmation) {
            return; // Exit the function if the user does not confirm
        }

        fetch(`/api/words/${wordId}`, {
            method: 'DELETE',
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to delete word');
            }
            loadWords(currentLevelId); // Reload words after deletion
        })
        .catch(err => console.error('Failed to delete word:', err));
    }

    // Update the user word status
    function updateWordStatus(wordId, knows) {
        fetch('/api/user-word-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, wordId, knows })
        })
        .then(response => response.json())
        .then(data => {
            console.log('User word status updated:', data);
        })
        .catch(err => console.error('Failed to update word status:', err));
    }

    // Show word details in a modal
    function showWordDetails(word) {
        currentWord = word;
        document.getElementById('word-detail-title').textContent = word.word;
        translationsContainer.innerHTML = '';

        fetch(`/api/translations/${word.id}`)
            .then(response => response.json())
            .then(translations => {
                console.log('Loaded translations:', translations); // Debugging
                currentWord.translations = translations; // Ensure translations are available
                translations.forEach((translation, index) => {
                    const translationItem = document.createElement('div');
                    translationItem.className = 'translation-item';

                    const translationText = document.createElement('div');
                    translationText.className = 'translation-text';
                    translationText.innerHTML = `<strong>Перевод:</strong> ${translation.translation}`;
                    translationItem.appendChild(translationText);

                    const usageText = document.createElement('div');
                    usageText.className = 'translation-text';
                    usageText.innerHTML = `<strong>Пример использования:</strong> ${translation.usage_example}`;
                    translationItem.appendChild(usageText);

                    const exampleTranslationText = document.createElement('div');
                    exampleTranslationText.className = 'translation-text';
                    exampleTranslationText.innerHTML = `<strong>Перевод примера:</strong> ${translation.example_translation}`;
                    translationItem.appendChild(exampleTranslationText);

                    const editButton = document.createElement('button');
                    editButton.className = 'edit-button';
                    editButton.textContent = 'Редактировать';
                    editButton.addEventListener('click', () => openEditModal(translation, index));
                    translationItem.appendChild(editButton);

                    const deleteButton = document.createElement('button');
                    deleteButton.className = 'delete-button';
                    deleteButton.textContent = 'Удалить';
                    deleteButton.addEventListener('click', () => deleteTranslation(translation.id));
                    translationItem.appendChild(deleteButton);

                    translationsContainer.appendChild(translationItem);
                });
                wordModal.style.display = 'flex';
            })
            .catch(err => console.error('Failed to load translations:', err));
    }

    // Open the edit modal for an existing translation
    function openEditModal(translation, index) {
        editIndex = index;
        document.getElementById('edit-translation').value = translation.translation || '';
        document.getElementById('edit-usage').value = translation.usage_example || '';
        document.getElementById('edit-example-translation').value = translation.example_translation || '';
        editModal.style.display = 'flex';
    }

    // Close modals
    closeButton.addEventListener('click', () => {
        wordModal.style.display = 'none';
    });

    closeEditButton.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    // Save changes to an existing translation or add a new one
    saveEditButton.addEventListener('click', () => {
        console.log('Save button clicked'); // Debugging

        // Handle the case when currentWord or currentWord.translations is undefined
        if (!currentWord || !currentWord.translations) {
            console.error('No word details available for saving');
            return;
        }

        const translation = {
            id: editIndex >= 0 ? currentWord.translations[editIndex]?.id : null,
            word_id: currentWord.id,
            translation: document.getElementById('edit-translation').value,
            usage_example: document.getElementById('edit-usage').value,
            example_translation: document.getElementById('edit-example-translation').value
        };

        fetch('/api/translations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(translation)
        })
        .then(response => response.json())
        .then(() => {
            editModal.style.display = 'none';
            showWordDetails(currentWord); // Reload details to reflect changes
        })
        .catch(err => console.error('Failed to save translation:', err));
    });

    // Open the edit modal for adding a new translation
    addTranslationButton.addEventListener('click', () => {
        editIndex = -1;
        document.getElementById('edit-translation').value = '';
        document.getElementById('edit-usage').value = '';
        document.getElementById('edit-example-translation').value = '';
        editModal.style.display = 'flex';
    });

    // Delete a translation
    function deleteTranslation(translationId) {
        const confirmation = confirm('Вы действительно хотите удалить этот перевод?');
        if (!confirmation) {
            return; // Exit the function if the user does not confirm
        }
        fetch(`/api/translations/${translationId}`, {
            method: 'DELETE'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to delete translation');
            }
            console.log('Translation deleted');
            showWordDetails(currentWord); // Refresh the details to reflect the deletion
        })
        .catch(err => console.error('Failed to delete translation:', err));
    }

    // Render pagination
    function renderPagination() {
        pagination.innerHTML = '';
        const totalPages = Math.ceil(words.length / wordsPerPage);

        if (currentPage > 1) {
            const prevButton = document.createElement('button');
            prevButton.textContent = 'Назад';
            prevButton.addEventListener('click', () => {
                currentPage--;
                renderWords();
                renderPagination();
            });
            pagination.appendChild(prevButton);
        }

        if (currentPage < totalPages) {
            const nextButton = document.createElement('button');
            nextButton.textContent = 'Вперед';
            nextButton.addEventListener('click', () => {
                currentPage++;
                renderWords();
                renderPagination();
            });
            pagination.appendChild(nextButton);
        }
    }

    // Initialize the page
    loadLevels();
});
