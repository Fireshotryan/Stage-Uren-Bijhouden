document.addEventListener('DOMContentLoaded', () => {
    const urenForm = document.getElementById('urenForm');
    const urenTable = document.getElementById('urenTable').getElementsByTagName('tbody')[0];
    const totaalUrenElement = document.getElementById('totaalUren');
    const urenOverElement = document.getElementById('urenOver');
    const MINIMUM_UREN = 640;
    const PAGE_SIZE = 10;
    let currentPage = 1;
    let currentEditIndex = null;
    let currentDeleteIndex = null;

    const ctx = document.getElementById('urenChart').getContext('2d');
    let urenChart;

    const editModal = document.getElementById('editModal');
    const deleteModal = document.getElementById('deleteModal');
    const closeEditModal = document.getElementById('closeEditModal');
    const closeDeleteModal = document.getElementById('closeDeleteModal');
    const confirmDeleteButton = document.getElementById('confirmDelete');
    const cancelDeleteButton = document.getElementById('cancelDelete');
    const deleteDetails = document.getElementById('deleteDetails');

    function opslaanUren(datum, uren, beschrijving) {
        const urenData = JSON.parse(localStorage.getItem('urenData')) || [];
        if (currentEditIndex !== null) {
            urenData[currentEditIndex] = { datum, uren, beschrijving };
            currentEditIndex = null;
        } else {
            urenData.push({ datum, uren, beschrijving });
        }
        localStorage.setItem('urenData', JSON.stringify(urenData));
        toonUren();
    }

    function verwijderenUren(index) {
        const urenData = JSON.parse(localStorage.getItem('urenData')) || [];
        urenData.splice(index, 1);
        localStorage.setItem('urenData', JSON.stringify(urenData));
        toonUren();
    }

    function updateTotaalUren() {
        const urenData = JSON.parse(localStorage.getItem('urenData')) || [];
        const totaal = urenData.reduce((acc, uur) => acc + parseFloat(uur.uren), 0);
        totaalUrenElement.textContent = `Totaal uren: ${totaal.toFixed(1)}`;
        urenOverElement.textContent = `Uren nog te gaan: ${Math.max(0, (MINIMUM_UREN - totaal).toFixed(1))}`;
        updateChart(totaal);
    }

    function updateChart(totaal) {
        const percentage = (totaal / MINIMUM_UREN) * 100;

        if (urenChart) {
            urenChart.destroy();
        }

        urenChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Gelopen uren', 'Nog te gaan'],
                datasets: [{
                    data: [totaal, MINIMUM_UREN - totaal],
                    backgroundColor: ['#4CAF50', '#FFC107'],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(tooltipItem) {
                                let label = tooltipItem.label || '';
                                let value = tooltipItem.raw || 0;
                                return `${label}: ${value.toFixed(1)} uren (${(value / MINIMUM_UREN * 100).toFixed(1)}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    function toonUren() {
        const urenData = JSON.parse(localStorage.getItem('urenData')) || [];
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const endIndex = Math.min(startIndex + PAGE_SIZE, urenData.length);
        const paginatedData = urenData.slice(startIndex, endIndex);

        urenTable.innerHTML = '';
        paginatedData.forEach((uur, index) => {
            const row = urenTable.insertRow();
            row.insertCell(0).textContent = uur.datum;
            row.insertCell(1).textContent = uur.uren;
            row.insertCell(2).textContent = uur.beschrijving;
            const actieCell = row.insertCell(3);

            const editButton = document.createElement('button');
            editButton.textContent = 'Aanpassen';
            editButton.addEventListener('click', () => {
                document.getElementById('editDatum').value = uur.datum;
                document.getElementById('editUren').value = uur.uren;
                document.getElementById('editBeschrijving').value = uur.beschrijving;
                currentEditIndex = startIndex + index;
                editModal.style.display = 'block';
            });
            actieCell.appendChild(editButton);

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Verwijderen';
            deleteButton.addEventListener('click', () => {
                currentDeleteIndex = startIndex + index;
                deleteDetails.textContent = `Datum: ${uur.datum}, Uren gewerkt: ${uur.uren}, Beschrijving: ${uur.beschrijving}`;
                deleteModal.style.display = 'block';
            });
            actieCell.appendChild(deleteButton);
        });

        updateTotaalUren();
        updatePagination();
    }

    function updatePagination() {
        const urenData = JSON.parse(localStorage.getItem('urenData')) || [];
        const totalPages = Math.ceil(urenData.length / PAGE_SIZE);

        document.getElementById('prevPage').disabled = currentPage === 1;
        document.getElementById('nextPage').disabled = currentPage === totalPages;
        document.getElementById('pageInfo').textContent = `Pagina ${currentPage}`;
    }

    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            toonUren();
        }
    });

    document.getElementById('nextPage').addEventListener('click', () => {
        const urenData = JSON.parse(localStorage.getItem('urenData')) || [];
        const totalPages = Math.ceil(urenData.length / PAGE_SIZE);
        if (currentPage < totalPages) {
            currentPage++;
            toonUren();
        }
    });

    function exportData() {
        const urenData = localStorage.getItem('urenData');
        const blob = new Blob([urenData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'urenData.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    function importData(file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const data = event.target.result;
            localStorage.setItem('urenData', data);
            toonUren();
        };
        reader.readAsText(file);
    }

    document.getElementById('exportData').addEventListener('click', exportData);
    document.getElementById('importData').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });

    document.getElementById('importFile').addEventListener('change', (event) => {
        if (event.target.files.length > 0) {
            importData(event.target.files[0]);
        }
    });

    toonUren();

    urenForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const datum = document.getElementById('datum').value;
        const uren = document.getElementById('uren').value;
        const beschrijving = document.getElementById('beschrijving').value;
        opslaanUren(datum, uren, beschrijving);
        urenForm.reset();
    });

    // Edit Modal
    document.getElementById('editForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const datum = document.getElementById('editDatum').value;
        const uren = document.getElementById('editUren').value;
        const beschrijving = document.getElementById('editBeschrijving').value;
        opslaanUren(datum, uren, beschrijving);
        editModal.style.display = 'none';
    });

    closeEditModal.addEventListener('click', () => {
        editModal.style.display = 'none';
    });

    // Delete Modal
    confirmDeleteButton.addEventListener('click', () => {
        if (currentDeleteIndex !== null) {
            verwijderenUren(currentDeleteIndex);
            deleteModal.style.display = 'none';
        }
    });

    cancelDeleteButton.addEventListener('click', () => {
        deleteModal.style.display = 'none';
    });

    closeDeleteModal.addEventListener('click', () => {
        deleteModal.style.display = 'none';
    });

    // Close modals when clicking outside of them
    window.addEventListener('click', (event) => {
        if (event.target === editModal || event.target === deleteModal) {
            editModal.style.display = 'none';
            deleteModal.style.display = 'none';
        }
    });
});
