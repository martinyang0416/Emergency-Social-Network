import { handleSpeedTestEvent, initializeSocket} from "./utils/socketUtils.js";
import { logout, verifyTokenAndRedirect } from "./utils/authUtils.js";

// Map Resource Review Client
document.addEventListener("DOMContentLoaded", () => {
    const token = sessionStorage.getItem("token");

    verifyTokenAndRedirect(token);
    const socket = initializeSocket();
    handleSpeedTestEvent(socket, logout);

    const username = sessionStorage.getItem("username");
    socket.emit("user online", { username });
    const resourceId = sessionStorage.getItem("resourceId");

    if (!resourceId) {
        alert("No resource selected.");
        window.location.href = "/map";
        return;
    }

    fetchReviews(resourceId);

    document.getElementById("back-button").addEventListener("click", () => {
        window.location.href = "/map";
    });

    document.getElementById("add-review-btn").addEventListener("click", () => {
        document.getElementById("add-review-modal").classList.remove("hidden");
    });

    document.getElementById("add-review-form").addEventListener("submit", (event) => {
        event.preventDefault();

        const content = document.getElementById("review-content").value.trim();
        const vote = document.querySelector('input[name="vote"]:checked')?.value;

        if (!content || vote === undefined) {
            alert("Please provide review content and select a vote option.");
            return;
        }

        addReview(resourceId, content, vote, token);
    });

    document.getElementById("cancel-add-review").addEventListener("click", () => {
        document.getElementById("add-review-modal").classList.add("hidden");
    });
});

function fetchReviews(resourceId) {
    const token = sessionStorage.getItem("token");

    fetch(`/reviews/resources/${resourceId}`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Failed to fetch reviews: ${response.statusText}`);
            }
            return response.json();
        })
        .then((data) => {
            const reviews = data.data || [];
            displayReviews(reviews);
        })
        .catch((error) => console.error("Error fetching reviews:", error));
}

function addReview(resourceId, content, vote, token) {
    fetch(`/reviews/resources/${resourceId}`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            content,
            vote: parseInt(vote),
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            alert(data.message || "Review added successfully!");
            document.getElementById("add-review-form").reset();
            document.getElementById("add-review-modal").classList.add("hidden");
            fetchReviews(resourceId);
        })
        .catch((error) => console.error("Error adding review:", error));
}

function displayReviews(reviews) {
    const reviewsContainer = document.getElementById("reviews-container");
    reviewsContainer.innerHTML = "";

    if (reviews.length === 0) {
        reviewsContainer.innerHTML = "<p>No reviews yet.</p>";
        return;
    }

    reviews.forEach((review) => {
        const reviewElement = document.createElement("div");
        reviewElement.className = "review";

        reviewElement.innerHTML = `
            <p><strong>${review.reviewer_name}</strong> @ ${new Date(
            review.created_at
        ).toLocaleString()}</p>
            <p>${review.upvote_downvote === 1 ? "👍" : "👎"}</p>
            <p>${review.review_content}</p>
        `;

        reviewsContainer.appendChild(reviewElement);
    });
}
