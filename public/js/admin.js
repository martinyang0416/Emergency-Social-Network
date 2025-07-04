// Function to show the Manage User modal
function showManageUserModal(user) {
    // Populate current user information
    document.getElementById("currentUsername").textContent = user.username;
    document.getElementById("currentAccountStatus").textContent = user.status || "Not available";
    document.getElementById("currentPrivilegeLevel").textContent = user.privilege || "Not available";

    // Pre-fill editable fields
    document.getElementById("username").value = user.username || "";
    document.getElementById("accountStatus").value = user.status || "active"; // Default to "active" if not set
    document.getElementById("privilegeLevel").value = user.privilege || "citizen"; // Default to "citizen" if not set

    // Clear the password field
    document.getElementById("password").value = "";

    // Show the modal
    const manageUserModal = new bootstrap.Modal(document.getElementById("manageUserModal"));
    manageUserModal.show();
}

// Fetch and display users
function fetchAndDisplayUsers() {
    fetch("/admin/users", {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    })
        .then((response) => {
            if (!response.ok) throw new Error("Failed to fetch users");
            return response.json();
        })
        .then((users) => {
            const userList = document.getElementById("userList");
            userList.innerHTML = users
                .map(
                    (user) => `
                <li class="list-group-item d-flex justify-content-between align-items-center">
                    <span>${user.username}</span>
                    <button class="btn btn-sm btn-primary manageUserBtn" data-user='${JSON.stringify(user)}'>Manage</button>
                </li>`
                )
                .join("");

            // Add event listeners to "Manage" buttons
            document.querySelectorAll(".manageUserBtn").forEach((button) => {
                button.addEventListener("click", () => {
                    const user = JSON.parse(button.getAttribute("data-user"));
                    showManageUserModal(user);
                });
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
}

// Submit updated user information
document.getElementById("updateUserForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const form = event.target;

    // Collect values
    const updatedUser = {
        username: document.getElementById("username").value.trim(),
        accountStatus: document.getElementById("accountStatus").value,
        privilegeLevel: document.getElementById("privilegeLevel").value,
        password: document.getElementById("password").value.trim(),
    };

    // Get the original (current) values displayed
    const originalUser = {
        username: document.getElementById("currentUsername").textContent.trim(),
        accountStatus: document.getElementById("currentAccountStatus").textContent.trim(),
        privilegeLevel: document.getElementById("currentPrivilegeLevel").textContent.trim(),
    };

    // Filter only the changed fields
    const changes = {};
    const currentUserName = originalUser.username
    if (updatedUser.username !== originalUser.username) changes.username = updatedUser.username;
    if (updatedUser.accountStatus !== originalUser.accountStatus) changes.accountStatus = updatedUser.accountStatus;
    if (updatedUser.privilegeLevel !== originalUser.privilegeLevel) changes.privilegeLevel = updatedUser.privilegeLevel;
    if (updatedUser.password) changes.password = updatedUser.password;
    const UserObject = await getUserID(originalUser.username);
    const UserID = UserObject.userID;
    
    console.log(UserID, currentUserName)

    // No changes to submit
    if (Object.keys(changes).length === 0) {
        Swal.fire({
            title: "No Changes",
            text: "No changes detected to submit.",
            icon: "info",
            confirmButtonText: "OK",
        });
        return;
    }

    try {
        // Validate only the changed fields
        if (changes.username) {
            const usernameValidationResult = await validateUsername(changes.username);
            if (usernameValidationResult.message === "Username exists") {
                throw new Error(usernameValidationResult.message || "Invalid username.");
            }
        }

        if (changes.password) {
            const passwordValidationResult = await validatePassword(changes.password);
            console.log(passwordValidationResult);
            if (passwordValidationResult.message != "Password is valid") {
                throw new Error(passwordValidationResult.message || "Invalid password.");
            }
        }

        // Show a confirmation dialog with the proposed changes
        const changesHtml = Object.entries(changes)
            .map(
                ([key, value]) =>
                    `<p><strong>${capitalizeFieldName(key)}:</strong> ${key === "password" ? "*".repeat(value.length) : value
                    }</p>`
            )
            .join("");

        Swal.fire({
            title: "Validate Changes",
            html: `
                <p>The following changes will be applied:</p>
                ${changesHtml}
            `,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Test",
            cancelButtonText: "Cancel",
        }).then((result) => {
            if (result.isConfirmed) {
                // Submit the changes to the server
                console.log(UserID);    
                fetch(`/admin/updateUser/${UserID}/${currentUserName}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(changes),
                })
                    .then((response) => {
                        if (!response.ok) throw new Error("Failed to update user");
                        return response.json();
                    })
                    .then((data) => {
                        Swal.fire({
                            title: "Success",
                            text: "Congradulations! All changes are valid.",
                            icon: "success",
                            confirmButtonText: "Confirm Changes",
                        }).then(() => {
                        Swal.fire({
                            title: "Success",
                            text: "User updated successfully.",
                            icon: "success",
                            confirmButtonText: "OK",
                        }).then(() => {
                            // Reload the user list after update
                            location.reload();
                            // fetchAndDisplayUsers();
                        });
                    });
                    })
                    .catch((error) => {
                        console.error("Error updating user:", error);
                        Swal.fire({
                            title: "Error",
                            text: "Failed to update user. Please try again later.",
                            icon: "error",
                            confirmButtonText: "OK",
                        });
                    });
            }
        });
    } catch (error) {
        Swal.fire({
            title: "Validation Error",
            text: error.message,
            icon: "error",
            confirmButtonText: "OK",
        });
    }
});

// Validate username via server-side
async function validateUsername(username) {
    const response = await fetch("/admin/validateUsername", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
    });

    if (!response.ok) {
        throw new Error("Username validation failed.");
    }
    return response.json();
}

// Validate password via server-side
async function validatePassword(password) {
    const response = await fetch("/admin/validatePassword", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
    });

    if (!response.ok) {
        throw new Error("Password validation failed.");
    }

    return response.json();
}

// Utility function to capitalize field names for display
function capitalizeFieldName(field) {
    return field.replace(/([A-Z])/g, " $1").replace(/^./, (str) => str.toUpperCase());
}

async function getUserID(username){
    const response = await fetch(`/admin/getUserID/${username}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
        },
    });

    if (!response.ok) {
        throw new Error("UserID get failed.");
    }

    return response.json();
}

// Initial fetch of users
fetchAndDisplayUsers();
