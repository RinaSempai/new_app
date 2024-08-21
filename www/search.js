document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const searchResultsContainer = document.getElementById('search-results');

    // Функция для выполнения поиска
    searchButton.addEventListener('click', () => {
        const query = searchInput.value.trim();

        if (query) {
            fetch(`/api/search?query=${encodeURIComponent(query)}`)
                .then(response => response.json())
                .then(results => {
                    displaySearchResults(results);
                })
                .catch(error => console.error('Error during search:', error));
        }
    });

    // Функция для отображения результатов поиска
    function displaySearchResults(results) {
        searchResultsContainer.innerHTML = ''; // Очистить предыдущие результаты

        if (results.length > 0) {
            results.forEach(result => {
                const resultItem = document.createElement('div');
                resultItem.className = 'search-result';
                resultItem.innerHTML = `
                    <p><strong>Слово:</strong> ${result.word}</p>
                    <p><strong>Перевод:</strong> ${result.translation}</p>
                    <p><strong>Пример использования:</strong> ${result.usage_example || 'Нет примера'}</p>
                `;
                searchResultsContainer.appendChild(resultItem);
            });
        } else {
            searchResultsContainer.innerHTML = '<p>Результаты не найдены</p>';
        }
    }
});
