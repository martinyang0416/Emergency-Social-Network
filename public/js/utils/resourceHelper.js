class resourceHelper {
    static validateQuantity(quantity) {
        if (quantity < 0) {
            throw new Error("Quantity cannot be negative. Please enter a valid number.");
        }

        const parsedQuantity = parseFloat(quantity);
        if (isNaN(parsedQuantity)) {
            throw new Error("Invalid quantity: must be a number.");
        }

        return parseInt(quantity, 10); // Ensure the quantity is a valid integer
    }

    static validateRequestFromName(requesterUsername, requestedFromUsername) {
        if (requestedFromUsername === requesterUsername) {
            throw new Error("You cannot request resources from yourself.");
        }
    }

    static createRequestRows(requests) {
        if (requests.length === 0) {
            return `<tr><td colspan="4" style="text-align:center;">No requests found</td></tr>`;
        }
    
        return requests.map((request) => {
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
    
            return `
                <tr>
                    <td data-label="Request from:">${request.requested_from_username}</td>
                    <td data-label="Resource type:">${resourceType}</td>
                    <td data-label="Quantity:">${quantity}</td>
                    <td data-label="Status:">${request.status || "Pending"}</td>
                    <td data-label="Action:">
                        <button class="btn btn-danger btn-sm withdraw-button" data-request-id="${request.request_id}">Withdraw</button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    static calculateTotalResources(resources) {
        return resources.reduce(
            (totals, user) => {
                totals.water += user.water || 0;
                totals.bread += user.bread || 0;
                totals.medicine += user.medicine || 0;
                return totals;
            },
            { water: 0, bread: 0, medicine: 0 } // Initialize totals
        );
    }
    

}

export default resourceHelper;