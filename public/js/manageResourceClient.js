import { handleSpeedTestEvent, initializeSocket } from "./utils/socketUtils.js";
import { logout, verifyTokenAndRedirect } from "./utils/authUtils.js";
import resourceHelper from "./utils/resourceHelper.js"

document.addEventListener('DOMContentLoaded', () => {
    const userResourcesTable = document.getElementById('user-resources-table');
    const receivedRequestsTable = document.getElementById('received-requests-table');

    // Retrieve token from sessionStorage
    const token = sessionStorage.getItem("token");
    verifyTokenAndRedirect(token);
    const socket = initializeSocket();
    handleSpeedTestEvent(socket, logout);
    
    socket.on("connect", () => {
        console.log(`Socket connected with ID: ${socket.id}`);
    });
    socket.on("request sent", function () {
        fetchReceivedRequests();
    });

    socket.on("request deleted", function () {
        fetchReceivedRequests();
    });

    loadUserResources();
    fetchReceivedRequests();

    // Populate user's own resources
    function loadUserResources() {
        const username = sessionStorage.getItem("username");
        fetch(`/resources/${username}`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
        })
        .then((response) => {
            if (!response.ok) {
                if (response.status === 404) {
                    // If 404, simulate an empty resource profile
                    return {};
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
            }
            return response.json();
        })
        .then((resourceProfile) => {
            console.log("User resource data fetched:", resourceProfile);
    
            // If no data (404 simulated), initialize an empty resourceProfile
            resourceProfile = resourceProfile || {};
    
            userResourcesTable.innerHTML = '';
            const resourceTypes = ['water', 'bread', 'medicine']; // Add your resource types here
            for (const resourceType of resourceTypes) {
                const quantity = resourceProfile[resourceType] || 0; // Default to 0 if not found
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${resourceType}</td>
                    <td>
                        <input type="number" value="${quantity}" min="0" class="form-control quantity-input" data-resource="${resourceType}" />
                    </td>
                `;
                userResourcesTable.appendChild(row);
            }
            // Attach event listeners to handle changes in quantity inputs
            const quantityInputs = document.querySelectorAll('.quantity-input');
            quantityInputs.forEach(input => {
                input.addEventListener('change', handleQuantityChange);
            });
        })
        .catch((error) => {
            console.error("Error fetching user status:", error);
        });
    }
    

    // Function to handle quantity change
    function handleQuantityChange(event) {
        const input = event.target;
        const newQuantity = input.value;
        const resourceType = input.getAttribute('data-resource');
        // Check if the quantity is negative
        try {
            const validatedQuantity = resourceHelper.validateQuantity(newQuantity); // Validate the quantity
            showQuantityChangePopup(resourceType, validatedQuantity, input);
        } catch (error) {
            console.error(error.message);
            input.value = 0; // Reset the input to a default valid value
            
        }
    }

    function showQuantityChangePopup(resourceType, newQuantity, inputElement) {
        Swal.fire({
            title: 'Confirm Resource Update',
            html: `
                <p>You are updating <strong>${resourceType}</strong> to <strong>${newQuantity}</strong>.</p>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Confirm',
            cancelButtonText: 'Cancel',
        }).then((result) => {
            if (result.isConfirmed) {
                updateResourceQuantity(resourceType, newQuantity);
            } else {
                // Reset the input value to the original if user cancels
                inputElement.value = inputElement.defaultValue;
                loadUserResources();
            }
        });
    }
    // Function to update resource quantity on the server
    function updateResourceQuantity(resourceType, newQuantity) {
        const username = sessionStorage.getItem("username");

        fetch(`/resources/${username}`, {
            method: "PUT",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                resourceType: resourceType,
                quantity: parseInt(newQuantity),
            }),
        })
        .then((response) => {
            if (!response.ok) {
                throw new Error("Failed to update resource quantity");
            }
            console.log(`Resource ${resourceType} updated to quantity ${newQuantity}`);
        })
        .catch((error) => {
            console.error("Error updating resource quantity:", error);
        });
    }

    function fetchReceivedRequests() {
        const username = sessionStorage.getItem("username");

        fetch(`/resources/receivedRequests/${username}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            }
        })
        .then(async (response) => {
            console.log("Received response for fetchReceivedRequests:", response);
            if (!response.ok) {
                const data = await response.json();
                if (data.message === "No received requests found for this user") {
                    displayReceivedRequests([]); // Clear the table
                }
            }
            return response.json();
        })
        .then((receivedRequests) => {
            if(receivedRequests){
                console.log("Received requests data:", receivedRequests); 
                displayReceivedRequests(receivedRequests); // Define this function to display data
            }
        })
        .catch((error) => {
            console.error("Error fetching received requests:", error);
        });
    }

    function displayReceivedRequests(receivedRequests) {
        receivedRequestsTable.innerHTML = ""; 
    
        if (receivedRequests.length === 0) {
            const row = document.createElement("tr");
            row.innerHTML = `<td colspan="4" style="text-align:center;">No received requests found</td>`;
            receivedRequestsTable.appendChild(row);
            return;
        }
    
        receivedRequests.forEach((request) => {
            let resourceType = "";
            let quantity = 0;
    
            // Determine resource type and quantity
            if (request.water > 0) {
                resourceType = "water";
                quantity = request.water;
            } else if (request.bread > 0) {
                resourceType = "bread";
                quantity = request.bread;
            } else if (request.medicine > 0) {
                resourceType = "medicine";
                quantity = request.medicine;
            }
    
            const row = document.createElement("tr");
            row.innerHTML = `
                <td data-label="Requester">${request.requester_username}</td>
                <td data-label="Resource">${resourceType}</td>
                <td data-label="Quantity">${quantity}</td>
                <td data-label="Status">${request.status || "Pending"}</td>
                <td data-label="Actions">
                    <button class="btn btn-success btn-sm accept-button" 
                    data-request-id="${request.request_id}"
                    data-requester-username="${request.requester_username}">Accept</button>
                    <button class="btn btn-danger btn-sm reject-button" data-request-id="${request.request_id}"
                    data-requester-username="${request.requester_username}">Reject</button>
                </td>
            `;
            receivedRequestsTable.appendChild(row);
        });
    
        // Add event listeners for Accept and Reject buttons
        document.querySelectorAll(".accept-button").forEach(button => {
            button.addEventListener("click", function() {
                const requestId = this.getAttribute("data-request-id");
                const requesterUsername = this.getAttribute("data-requester-username");
                const requestedFromUsername = sessionStorage.getItem("username");
                handleAcceptRequest(requestId, requesterUsername, requestedFromUsername);
            });
        });
    
        document.querySelectorAll(".reject-button").forEach(button => {
            button.addEventListener("click", function() {
                const requestId = this.getAttribute("data-request-id");
                const requesterUsername = this.getAttribute("data-requester-username");
                const requestedFromUsername = sessionStorage.getItem("username");
                handleRejectRequest(requestId, requesterUsername, requestedFromUsername);
            });
        });
    }
    
    function handleAcceptRequest(requestId, requesterUsername, requestedFromUsername) {
        fetch(`/resources/request/approvedRequest`, {
            method: "PUT",
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
                throw new Error("Failed to accept request");
            }
            console.log("Request accepted and deleted successfully");
            fetchReceivedRequests(); // Refresh the list of received requests
            loadUserResources();
        })
        .catch((error) => {
            console.error("Error accepting request:", error);
        });
    }

    // Function to handle rejecting a request
    function handleRejectRequest(requestId, requesterUsername, requestedFromUsername) {
        fetch(`/resources/request/rejectedRequest`, {
            method: "PUT",
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
                throw new Error("Failed to reject request");
            }
            console.log("Request rejected and deleted successfully");
            fetchReceivedRequests(); // Refresh the list of received requests
        })
        .catch((error) => {
            console.error("Error rejecting request:", error);
        });
    }

    

});
