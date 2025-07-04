import { handleSpeedTestEvent, initializeSocket} from "./utils/socketUtils.js";
import { logout, verifyTokenAndRedirect } from "./utils/authUtils.js";
import resourceHelper from "./utils/resourceHelper.js";

document.addEventListener("DOMContentLoaded", () => {
    const token = sessionStorage.getItem("token"); 
    verifyTokenAndRedirect(token);
    const socket = initializeSocket();
    handleSpeedTestEvent(socket, logout);

    socket.on("request deleted", function () {
        console.log("request deleted!!");
        fetchUserRequests();
    });
    const username = sessionStorage.getItem("username"); 

    const requestForm = document.getElementById("resource-request-form");
    const requestsTable = document.getElementById("sent-requests-table");

    // Handle form submission to create a new resource request
    requestForm.addEventListener("submit", (event) => {
        event.preventDefault(); 
        const requestedFromUsername = document.getElementById("requestFrom").value;
        const resourceType = document.getElementById("resourceType").value;
        const quantity = document.getElementById("quantity").value;

        try {
            resourceHelper.validateRequestFromName(username, requestedFromUsername);
            // Show confirmation popup
            Swal.fire({
                title: 'Confirm Request',
                html: `
                    <p>Are you sure you want to request:</p>
                    <div><strong>From:</strong> ${requestedFromUsername}</div>
                    <div><strong>Resource:</strong> ${resourceType}</div>
                    <div><strong>Quantity:</strong> ${quantity}</div>
                `,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Confirm',
                cancelButtonText: 'Cancel',
            }).then((result) => {
                if (result.isConfirmed) {
                    // If the user confirms, create the resource request
                    createResourceRequest(username, requestedFromUsername, resourceType, quantity);
                }
            });
        } catch (error) {
            Swal.fire({
                icon: 'warning',
                title: 'Invalid Request',
                text: error.message,
            });
            return; 
        }
    });

    // Function to create a new resource request
    function createResourceRequest(requesterUsername, requestedFromUsername, resourceType, quantity) {
        fetch("/resources/newRequest", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                requesterUsername,
                requestedFromUsername,
                resourceType,
                quantity: parseInt(quantity)
            })
        })
            .then((response) => {
                if (!response.ok) {
                    return response.json().then(data => {
                        console.error("Server responded with error:", data);
                        throw new Error(data.error || "Failed to create resource request.");
                    });
                }
                return response.json();
            })
            .then((data) => {
                fetchUserRequests(); // Refresh the requests list
            })
            .catch((error) => {
                if (error.message === "Requested quantity exceeds available amount.") {
                    Swal.fire({
                        icon: 'error',
                        title: 'Request Denied',
                        text: 'Requested amount exceeds the available quantity of the user.',
                    });
                } else if (error.message === "Requested user not found or has no resources available.") {
                    Swal.fire({
                        icon: 'error',
                        title: 'Request Denied',
                        text: 'The user you requested resources from does not exist or has no available resources.',
                    });
                } else {
                    console.error("Error creating resource request:", error);
                }
            });
    }

    // Load all resource requests created by the current user
    function fetchUserRequests() {
        fetch(`/resources/sentRequests/${username}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            }
        })
        .then((response) => {
            if (!response.ok) {
                return response.json().then((data) => { 
                    if (data.message === "No sent requests found for this user") {
                        displayRequests([]); // Clear the table
                    } 
                });
            }
            return response.json(); // Parse as JSON if successful
        })
        .then((data) => {
            if (data) {
                displayRequests(data); // Display the fetched requests
            }
        })
        .catch((error) => {
            console.error("Error fetching user requests:", error);
        });
    }

    // Display requests in the table
    function displayRequests(requests) {
        requestsTable.innerHTML = resourceHelper.createRequestRows(requests);

        document.querySelectorAll(".withdraw-button").forEach(button => {
            button.addEventListener("click", function() {
                const requestId = this.getAttribute("data-request-id");
                const requestedFromUsername = document.getElementById("requestFrom").value;
                withdrawRequest(requestId, username, requestedFromUsername);
            });
        });
    }

    function withdrawRequest(requestId, requesterUsername, requestedFromUsername) {
        fetch(`/resources/request`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
                requestId,
                requesterUsername,
                requestedFromUsername,
            })
        })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Failed to withdraw request.");
            }
            console.log("Request withdrawn successfully");
            fetchUserRequests(); // Refresh the list of requests
        })
        .catch((error) => {
            console.error("Error withdrawing request:", error);
        });
    }
    
    
    

    // Load user requests on page load
    fetchUserRequests();
});
