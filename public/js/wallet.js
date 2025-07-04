import { initializeSocket } from "./utils/socketUtils.js";


document.addEventListener("DOMContentLoaded", () => {
    const balanceElement = document.getElementById("balance");
    const transactionList = document.getElementById("transaction-list");
    const groupBySelect = document.getElementById("groupBySelect");
    const username = sessionStorage.getItem("username");
    let allTransactions = []; // Store all transactions for filtering

    // Fetch options for reuse
    const fetchOptions = {
        method: "GET",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("token")}`,
        },
    };

    // Fetch user balance
    fetch(`/wallet/balance/${username}`, fetchOptions)
        .then((response) => {
            if (!response.ok) throw new Error("Failed to fetch balance");
            return response.json();
        })
        .then((data) => {
            // Update balance on the page
            balanceElement.textContent = data.balance.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
            });
        })
        .catch((error) => {
            console.error("Error fetching balance:", error);
            balanceElement.textContent = "Error fetching balance";
        });

    // Fetch transactions
    function fetchTransactions() {
        fetch(`/wallet/transactions/${username}`, fetchOptions)
            .then((response) => {
                if (!response.ok) throw new Error("Failed to fetch transactions");
                return response.json();
            })
            .then((transactions) => {
                allTransactions = transactions; // Save all transactions
                renderTransactions(transactions); // Render initially
            })
            .catch((error) => {
                console.error("Error fetching transactions:", error);
                transactionList.innerHTML = `<li class="error">Error fetching transactions</li>`;
            });
    }

    // Render transactions
    function renderTransactions(transactions) {
        if (transactions.length > 0) {
            transactionList.innerHTML = transactions
                .map((transaction) => {
                    const isOutgoing = transaction.sender === username;
                    const isTopUp = transaction.receiver === "topup";
                    const isWithdraw = transaction.receiver === "withdraw";

                    const amountClass = isTopUp
                        ? "positive"
                        : isWithdraw || isOutgoing
                            ? "negative"
                            : "positive";

                    return `
                    <li class="transaction-item">
                        <div class="transaction-info">
                            <span class="transaction-type">
                                ${isTopUp
                            ? "Top-Up"
                            : isWithdraw
                                ? "Withdraw"
                                : isOutgoing
                                    ? `Sent to ${transaction.receiver}`
                                    : `Received from ${transaction.sender}`
                        }
                            </span>
                            <span class="transaction-amount ${amountClass}">
                                ${isTopUp || (!isWithdraw && !isOutgoing) ? "+" : "-"}
                                ${transaction.amount.toLocaleString("en-US", {
                            style: "currency",
                            currency: "USD",
                        })}
                            </span>
                        </div>
                        <div class="transaction-date">
                            ${new Date(transaction.transaction_date).toLocaleString()}
                        </div>
                    </li>
                `;
                })
                .join("");
        } else {
            transactionList.innerHTML = `<li class="no-transactions">No transactions found</li>`;
        }
    }

    // Handle grouping
    groupBySelect.addEventListener("change", () => {
        const groupByValue = groupBySelect.value;

        const filteredTransactions = groupByValue === "user"
            ? allTransactions.filter(
                (transaction) =>
                    transaction.receiver !== "topup" && transaction.receiver !== "withdraw"
            )
            : groupByValue === "withdraw"
                ? allTransactions.filter((transaction) => transaction.receiver === "withdraw")
                : groupByValue === "topup"
                    ? allTransactions.filter((transaction) => transaction.receiver === "topup")
                    : allTransactions;

        renderTransactions(filteredTransactions);
    });

    // Fetch transactions on page load
    fetchTransactions();

    // Show statistics modal
    document.getElementById("showStatisticsBtn").addEventListener("click", () => {
        fetch(`/wallet/statistics/${username}`, fetchOptions)
            .then((response) => {
                if (!response.ok) throw new Error("Failed to fetch statistics");
                return response.json();
            })
            .then((data) => {
                showStatisticsModal(data);
            })
            .catch((error) => {
                console.error("Error fetching statistics:", error);
                Swal.fire({
                    title: "Error",
                    text: "Failed to fetch statistics. Please try again later.",
                    icon: "error",
                    confirmButtonText: "OK",
                    confirmButtonColor: "#dc3545",
                });
            });
    });

    async function showStatisticsModal() {
        try {
            const response = await fetch(`/wallet/statistics/${username}`, fetchOptions);
            if (!response.ok) {
                throw new Error("Failed to fetch statistics");
            }
            const data = await response.json();

            // Money In/Out Data for Pie Chart
            const pieChartData = {
                labels: ["Money In", "Money Out"],
                datasets: [
                    {
                        label: "Money In/Out",
                        data: [data.moneyIn, data.moneyOut],
                        backgroundColor: ["#28a745", "#dc3545"], // Green for in, Red for out
                    },
                ],
            };

            // Configure Pie Chart
            const pieCtx = document.getElementById("moneyPieChart").getContext("2d");
            if (window.pieChartInstance) {
                window.pieChartInstance.destroy(); // Destroy previous instance
            }
            window.pieChartInstance = new Chart(pieCtx, {
                type: "pie",
                data: pieChartData,
                options: {
                    plugins: {
                        legend: { position: "top" },
                    },
                },
            });

            // Money In/Out Data for Bar Chart
            const barChartData = {
                labels: ["Money In", "Money Out"],
                datasets: [
                    {
                        label: "Transaction Amount",
                        data: [data.moneyIn, data.moneyOut],
                        backgroundColor: ["#17a2b8", "#ff851b"], // Teal and Orange
                    },
                ],
            };

            // Configure Bar Chart
            const barCtx = document.getElementById("moneyBarChart").getContext("2d");
            if (window.barChartInstance) {
                window.barChartInstance.destroy(); // Destroy previous instance
            }
            window.barChartInstance = new Chart(barCtx, {
                type: "bar",
                data: barChartData,
                options: {
                    scales: {
                        y: { beginAtZero: true },
                    },
                    plugins: {
                        legend: { display: false },
                    },
                },
            });

            // Populate Statistics Table
            const statisticsTable = document.getElementById("statisticsTable");
            statisticsTable.innerHTML = `
        <table class="table table-bordered">
            <thead>
                <tr>
                    <th>Type</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Money In</td>
                    <td>${data.moneyIn.toLocaleString("en-US", { style: "currency", currency: "USD" })}</td>
                </tr>
                <tr>
                    <td>Money Out</td>
                    <td>${data.moneyOut.toLocaleString("en-US", { style: "currency", currency: "USD" })}</td>
                </tr>
            </tbody>
        </table>
    `;

            // Show Modal
            const modal = new bootstrap.Modal(document.getElementById("statisticsModal"));
            modal.show();

            const modalElement = document.getElementById("statisticsModal");
            const closeButton = modalElement.querySelector('.btn-close');

            closeButton.addEventListener('click', () => {
                modal.hide();
            });

        } catch (error) {
            console.error("Error in modal setup:", error);
            Swal.fire({
                title: "Error",
                text: "Failed to display statistics.",
                icon: "error",
                confirmButtonText: "OK",
                confirmButtonColor: "#dc3545",
            });
        }
    }



    document.getElementById("donate-btn").addEventListener("click", () => {
        // Fetch and display users in the modal
        fetch("/wallet/users", {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${sessionStorage.getItem("token")}`,
            },
        })
            .then((response) => {
                if (!response.ok) throw new Error.message;
                return response.json();
            })
            .then((users) => {
                const userList = document.getElementById("userList");
                userList.innerHTML = users
                    .map(
                        (user) => `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span>${user.username} (${user.citizenStatus})</span>
                        <button class="btn btn-sm btn-primary selectUserBtn" data-username="${user.username}">Select</button>
                    </li>`
                    )
                    .join("");

                // Add click event to each button
                document.querySelectorAll(".selectUserBtn").forEach((button) => {
                    button.addEventListener("click", () => {
                        const receiver = button.getAttribute("data-username");
                        showDonationModal(receiver);
                    });
                });

                const modal = new bootstrap.Modal(document.getElementById("userListModal"));
                modal.show();

                const modalElement = document.getElementById("userListModal");
                const closeButton = modalElement.querySelector('.btn-close');
                closeButton.addEventListener('click', () => {
                    modal.hide();
                });
            })
            .catch((error) => {
                console.error("Error fetching users:", error);
                Swal.fire({
                    title: "Error",
                    text: "Failed to fetch users. Please try again later.",
                    icon: "error",
                    confirmButtonText: "OK",
                });
            });
    });

    function showDonationModal(receiver) {
        // Populate and show donation modal
        document.getElementById("receiverName").textContent = receiver;

        const modal = new bootstrap.Modal(document.getElementById("donationModal"));
        modal.show();


        const modalElement = document.getElementById("donationModal");
        const closeButton = modalElement.querySelector('.btn-close');

        closeButton.addEventListener('click', () => {
            modal.hide();
        });

        

        // Handle donation confirmation
        document.getElementById("confirmDonationBtn").onclick = () => {
            const amount = document.getElementById("donationAmount").value;
            const sender = sessionStorage.getItem("username");

            if (!amount || amount <= 0) {
                Swal.fire({
                    title: "Invalid Amount",
                    text: "Please enter a valid amount.",
                    icon: "warning",
                    confirmButtonText: "OK",
                });
                return;
            }

            fetch("/wallet/donations", {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${sessionStorage.getItem("token")}`,
                },
                body: JSON.stringify({ sender, receiver, amount }),
            })
                .then((response) => {
                    if (!response.ok) {
                        return response.json().then((errorData) => {
                            throw new Error(errorData.message);
                        });
                    }
                    return response.json();
                })
                .then((data) => {
                    Swal.fire({
                        title: "Success",
                        text: data.message,
                        icon: "success",
                        confirmButtonText: "OK",
                    }).then(() => {
                        // Close the modal and refresh the page
                        modal.hide();
                        window.location.reload(); // Refresh the wallet page
                    });
                })
                .catch((error) => {
                    if (error.message == "Insufficient balance") {
                        Swal.fire({
                            title: "Insufficient Balance",
                            text: "You do not have enough balance to complete this donation transaction.",
                            icon: "error",
                            confirmButtonText: "OK",
                            confirmButtonColor: "#dc3545"
                        });
                    } else {
                        console.error("Error processing donation:", error);
                        Swal.fire({
                            title: "Error",
                            text: "Failed to process donation. Please try again later.",
                            icon: "error",
                            confirmButtonText: "OK",
                        });
                    }
                });
        };
    }

    const socket = initializeSocket();
    socket.on("donation received", (data) => {
        console.log("Donation received:", data);
        const { sender, amount } = data;
        Swal.fire({
            title: "You just received a donation from " + sender,
            text: "Amount: " + amount.toLocaleString("en-US", { style: "currency", currency: "USD" }),
            icon: "success",
            confirmButtonText: "OK",
        }).then(() => {
            // Refresh the wallet page
            window.location.reload();
        });
    });

});
