document.addEventListener('DOMContentLoaded', () => {
    const viewStatisticsButton = document.getElementById('view-statistics');
    const statisticsModal = document.getElementById('statistics-modal');
    const closeStatisticsButton = document.querySelector('.close-statistics-button');
    const statisticsTableBody = document.querySelector('#statistics-table tbody');

    // Open the statistics modal
    viewStatisticsButton.addEventListener('click', () => {
        loadStatistics();
        statisticsModal.style.display = 'flex';
    });

    // Close the statistics modal
    closeStatisticsButton.addEventListener('click', () => {
        statisticsModal.style.display = 'none';
    });

    // Load statistics from the server
    function loadStatistics() {
        fetch('/api/get-learning-results')
            .then(response => response.json())
            .then(results => {
                statisticsTableBody.innerHTML = ''; // Clear existing rows
                results.forEach(result => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${result.learning_date}</td>
                        <td>${result.time_spent}</td>
                        <td>${result.level_name}</td>
                        <td>${result.correct_answers}</td>
                        <td>${result.incorrect_answers}</td>
                    `;
                    statisticsTableBody.appendChild(row);
                });
            })
            .catch(err => console.error('Failed to load statistics:', err));
    }
});
