// Mode toggle logic
const toggleModeBtn = document.getElementById('toggleModeBtn');
const pageTitle = document.getElementById('pageTitle');
const cardSectionTitle = document.getElementById('cardSectionTitle');
const amountSectionTitle = document.getElementById('amountSectionTitle');
const confirmBtn = document.getElementById('confirmBtn');
const cardListPlaceholder = document.getElementById('card-list-placeholder');

let isTopUpMode = true; // Default mode
let selectedCard = null; // Track selected card


// Check query parameter to set initial mode
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('mode') === 'withdraw') {
    isTopUpMode = false;
}

// Update page content dynamically based on mode
const updatePageContent = () => {
    toggleModeBtn.textContent = isTopUpMode ? 'Switch to Withdraw' : 'Switch to Top-Up';
    pageTitle.textContent = isTopUpMode ? 'Top-Up Your Wallet' : 'Withdraw from Your Wallet';
    cardSectionTitle.textContent = isTopUpMode ? 'Your Linked Cards' : 'Select a Card for Withdrawal';
    amountSectionTitle.textContent = isTopUpMode ? 'Enter Amount to Top-Up' : 'Enter Amount to Withdraw';
    confirmBtn.textContent = isTopUpMode ? 'Confirm Top-Up' : 'Confirm Withdrawal';

    cardListPlaceholder.innerHTML = isTopUpMode
        ? '<p>No cards linked yet. Please add a card to top-up.</p>'
        : '<p>No cards linked yet. Please add a card to withdraw.</p>';
};

// Initialize page content
updatePageContent();

// Toggle mode when the button is clicked
toggleModeBtn.addEventListener('click', () => {
    isTopUpMode = !isTopUpMode;
    updatePageContent();
    fetchAllCards();
});

const username = sessionStorage.getItem("username");

function fetchAllCards() {
    // Fetch user cards from the backend
    fetch(`/wallet/cards/${username}`, {
        method: "GET",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("token")}`
        }
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Failed to fetch cards");
            }
            return response.json();
        })
        .then((cards) => {
            if (cards.length > 0) {
                cardListPlaceholder.innerHTML = cards
                    .map(
                        (card, index) => `
                        <div class="credit-card" id="card-${index}" data-card-number="${card.card_number}">
                            <div class="circle1"></div>
                            <div class="circle2"></div>
                            <div class="head">
                                <div>
                                    <i class="fa-solid fa-credit-card fa-2xl"></i>
                                </div>
                                <div>Virtual Card</div>
                            </div>
                            <div class="number">
                                <div>${card.card_number.slice(0, 4)}</div>
                                <div>${card.card_number.slice(4, 8)}</div>
                                <div>${card.card_number.slice(8, 12)}</div>
                                <div>${card.card_number.slice(12, 16)}</div>
                            </div>
                            <div class="tail">
                                <div>${card.card_holder}</div>
                                <div class="exp">Exp: 
                                  <span class="exp-date">${String(card.expire_month).padStart(2, "0")}/${card.expire_year}</span>
                                </div>
                            </div>
                        </div>
                    `
                    )
                    .join("");

                // Add event listeners to highlight selected card
                cards.forEach((_, index) => {
                    const cardElement = document.getElementById(`card-${index}`);
                    cardElement.addEventListener("click", () => selectCard(cardElement));
                });
            } else {
                cardListPlaceholder.innerHTML = `<p>No cards linked yet. Please add a card to top-up or withdraw.</p>`;
            }
        })
        .catch((error) => {
            console.error("Error fetching cards:", error);
            cardListPlaceholder.innerHTML = `<p>Error fetching cards. Please try again later.</p>`;
        });
}

function selectCard(cardElement) {
    // Deselect any previously selected card
    if (selectedCard) {
        selectedCard.classList.remove("selected");
    }

    // Highlight the clicked card with animation
    cardElement.classList.add("selected");
    selectedCard = cardElement;
}

// Handle form submission
confirmBtn.addEventListener("click", (e) => {
    e.preventDefault();

    if (!selectedCard) {
        Swal.fire({
            title: "No Card Selected",
            text: "Please select a card before proceeding.",
            icon: "warning",
            confirmButtonText: "OK",
            confirmButtonColor: "#dc3545"
        });
        return;
    }

    // Ask for CVV input
    Swal.fire({
        title: "Enter CVV",
        input: "password",
        inputLabel: "CVV Code",
        inputPlaceholder: "Enter your 3-digit CVV",
        inputAttributes: {
            maxlength: 3,
            autocapitalize: "off",
            autocorrect: "off"
        },
        showCancelButton: true,
        confirmButtonText: "Submit",
        confirmButtonColor: "#28a745",
        cancelButtonText: "Cancel"
    }).then((result) => {
        if (result.isConfirmed) {
            const cvv = result.value;
            const cardNumber = selectedCard.getAttribute("data-card-number");
            const amount = document.getElementById("topupAmount").value.trim();

            console.log(username, cardNumber, cvv)

            // Send CVV and card details to the backend for verification
            fetch(`/wallet/verifications`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${sessionStorage.getItem("token")}`
                },
                body: JSON.stringify({ username, cardNumber, cvv, isTopUpMode, amount })
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
                        confirmButtonColor: "#28a745"
                    });
                })
                .catch((error) => {
                    if (error.message == "Insufficient balance") {
                        Swal.fire({
                            title: "Insufficient Balance",
                            text: "You do not have enough balance to complete this withdraw transaction.",
                            icon: "error",
                            confirmButtonText: "OK",
                            confirmButtonColor: "#dc3545"
                        });
                    } else {
                    Swal.fire({
                        title: "Error",
                        text: "Invalid CVV or card verification failed.",
                        icon: "error",
                        confirmButtonText: "Retry",
                        confirmButtonColor: "#dc3545"
                    });
                }
                });
        }
    });
});

document.addEventListener("DOMContentLoaded", () => {
    fetchAllCards();
});
