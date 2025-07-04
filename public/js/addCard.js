document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("addCardForm").addEventListener("submit", async function (event) {
        event.preventDefault(); // Prevent form submission to server

        // Get input values
        const cardNumber = document.getElementById("cardNumber").value.trim();
        const holderName = document.getElementById("holderName").value.trim();
        const expire_month = document.getElementById("expiryMonth").value.trim();
        const expire_year = document.getElementById("expiryYear").value.trim();
        const cvv = document.getElementById("cvv").value.trim();
        const username = sessionStorage.getItem("username");

        const isCardValid = /^[0-9]{16}$/.test(cardNumber); // Ensures 16 digits
        const isNameValid = /^[a-zA-Z\s]+$/.test(holderName); // Ensures only alphabets and spaces

        if (isCardValid && isNameValid) {
            try {
                const response = await fetch("/wallet/cards", {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${sessionStorage.getItem("token")}`,
                    },
                    body: JSON.stringify({ username, cardNumber, holderName, expire_month, expire_year, cvv }),
                });

                if (!response.ok) throw new Error("Failed to add card");

                const data = await response.json();

                Swal.fire({
                    title: "Your card has been added successfully",
                    icon: "success",
                    confirmButtonText: "Back to Wallet",
                    confirmButtonColor: "#28a745",
                }).then(() => {
                    window.location.reload(); // Reload page to fetch updated cards
                });
            } catch (error) {
                Swal.fire({
                    title: "Error adding card",
                    text: "This card has been added to your wallet, please try another card.",
                    icon: "error",
                    confirmButtonText: "Back",
                    confirmButtonColor: "#dc3545",
                });
            }
        } else {
            Swal.fire({
                title: "Your card information is not correct",
                text: "Please recheck the details and try again.",
                icon: "error",
                confirmButtonText: "Back",
                confirmButtonColor: "#dc3545",
            });
        }
    });
});
// Function to fetch and display linked cards
function fetchAndDisplayCards() {
    const username = sessionStorage.getItem("username");

    fetch(`/wallet/cards/${username}`, {
        method: "GET",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionStorage.getItem("token")}`
        }
    })
        .then((response) => {
            if (!response.ok) throw new Error("Failed to fetch cards");
            return response.json();
        })
        .then((cards) => {
            const linkedCardsContainer = document.getElementById("linkedCards");

            if (cards.length > 0) {
                linkedCardsContainer.innerHTML = cards
                    .map(
                        (card, index) => `
                            <div class="credit-card" id="card-${index}">
                                <div class="remove-btn" data-card-number="${card.card_number}">
                                    &times;
                                </div>
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

                // Attach event listeners to "Remove" buttons
                document.querySelectorAll(".remove-btn").forEach((button) => {
                    button.addEventListener("click", () => {
                        const cardNumber = button.getAttribute("data-card-number");
                        handleRemoveCard(cardNumber);
                    });
                });
            } else {
                linkedCardsContainer.innerHTML = `<p>No cards linked yet. Please add a card to your wallet.</p>`;
            }
        })
        .catch((error) => {
            console.error("Error fetching cards:", error);
            document.getElementById("linkedCards").innerHTML = `<p>Error fetching cards. Please try again later.</p>`;
        });
}

// Function to handle card removal
function handleRemoveCard(cardNumber) {
    Swal.fire({
        title: "Are you sure?",
        text: "Do you want to remove this card from your wallet?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, remove it!",
        confirmButtonColor: "#dc3545",
        cancelButtonText: "Cancel",
        cancelButtonColor: "#6c757d",
    }).then((result) => {
        if (result.isConfirmed) {
            // Send request to backend to remove card
            fetch(`/wallet/cards/${cardNumber}`, {
                method: "DELETE",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${sessionStorage.getItem("token")}`,
                },
            })
                .then((response) => {
                    if (!response.ok) throw new Error("Failed to remove card");

                    // Success popup
                    Swal.fire({
                        title: "Card Removed",
                        text: "The card has been removed from your wallet.",
                        icon: "success",
                        confirmButtonText: "OK",
                        confirmButtonColor: "#28a745",
                    }).then(() => {
                        fetchAndDisplayCards(); // Refresh the card list
                    });
                })
                .catch((error) => {
                    console.error("Error removing card:", error);
                    Swal.fire({
                        title: "Error",
                        text: "Failed to remove card. Please try again later.",
                        icon: "error",
                        confirmButtonText: "OK",
                        confirmButtonColor: "#dc3545",
                    });
                });
        }
    });
}

// Call the function to fetch and display cards
fetchAndDisplayCards();
