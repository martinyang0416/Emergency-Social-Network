import { handleSpeedTestEvent, initializeSocket} from "./utils/socketUtils.js";
import { logout, verifyTokenAndRedirect } from "./utils/authUtils.js";
import resourceHelper from "./utils/resourceHelper.js";

document.addEventListener('DOMContentLoaded', () => {
    const allUsersResourcesTable = document.getElementById('all-users-resources-table');
    const totalWaterElement = document.getElementById('total-water');
    const totalBreadElement = document.getElementById('total-bread');
    const totalMedicineElement = document.getElementById('total-medicine');
    let resourceChart;

    // Retrieve token from sessionStorage
    const token = sessionStorage.getItem("token");

    verifyTokenAndRedirect(token);
    const socket = initializeSocket();
    handleSpeedTestEvent(socket, logout);
    
    socket.on("updateUserReource", function() {
        console.log("update resource dashboard");
        loadAllUsersResources();
    })
    // Load all users' resources
    loadAllUsersResources();

    function loadAllUsersResources() {
        fetch("/resources/allUsers", {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        })
        .then((response) => response.json())
        .then((allResources) => {
            console.log("All users' resources data fetched:", allResources);

            // Clear existing table rows
            allUsersResourcesTable.innerHTML = '';

            const totals = resourceHelper.calculateTotalResources(allResources);

            // let totalWater = 0;
            // let totalBread = 0;
            // let totalMedicine = 0;

            // Populate table with each user's resource data
            allResources.forEach(user => {
                // totalWater += user.water || 0;
                // totalBread += user.bread || 0;
                // totalMedicine += user.medicine || 0;


                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${user.username}</td>
                    <td>${user.citizenStatus}</td>
                    <td>${user.water}</td>
                    <td>${user.bread}</td>
                    <td>${user.medicine}</td>
                `;
                allUsersResourcesTable.appendChild(row);
            });

            // Update total resource elements
            totalWaterElement.textContent = totals.water;
            totalBreadElement.textContent = totals.bread;
            totalMedicineElement.textContent = totals.medicine;

            updateResourceChart(totals.water, totals.bread, totals.medicine);
        })
        .catch((error) => {
            console.error("Error fetching all users' resources:", error);
        });
    }

    function updateResourceChart(totalWater, totalBread, totalMedicine) {
        const data = {
            labels: ["Water", "Bread", "Medicine"],
            datasets: [{
                label: "Total Resources",
                data: [totalWater, totalBread, totalMedicine],
                backgroundColor: ["#4e73df", "#1cc88a", "#36b9cc"]
            }]
        };

        const config = {
            type: "bar",
            data: data,
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        };

        // Initialize or update the chart
        if (resourceChart) {
            resourceChart.data.datasets[0].data = [totalWater, totalBread, totalMedicine];
            resourceChart.update();
        } else {
            const ctx = document.getElementById("resourceChart").getContext("2d");
            resourceChart = new Chart(ctx, config);
        }
    }
});
