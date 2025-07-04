document.addEventListener("DOMContentLoaded", function () {
    const registerForm = document.getElementById("join-form");
    let token = sessionStorage.getItem("token");

    registerForm.addEventListener("submit", function (event) {
        event.preventDefault();
        validateRegistration();
    });

    //utility function to show error message
    function errorMessagePopup(message) {
        Swal.fire({
            icon: "error",
            title: "Oops...",
            text: message,
        });
    }

    function validateRegistration() {
        const usernameInput = document.getElementById("username");
        const passwordInput = document.getElementById("password");

        const requestBody = {
            username: usernameInput.value,
            password: passwordInput.value,
        };

        fetch(`/users/${usernameInput.value}/validation`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        }).then(async (response) => {
            if (response.ok) {
                const res = await response.json();
                sessionStorage.setItem("username", usernameInput.value);
                sessionStorage.setItem("password", passwordInput.value);
                if (response.status === 202) {
                    // User already exists but not acknowledged
                    // no token is returned
                    window.location.href = "/new_user_acknowledge_page";
                } else if (response.status === 200) {
                    sessionStorage.setItem("token", res.token);
                    window.location.href = "/home";
                } else {
                    showConfirmationPopup(
                        usernameInput.value,
                        passwordInput.value
                    );
                }
                sessionStorage.setItem("privilege", res.privilege);
            } else {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    console.error("Response is not valid JSON:", e);
                    alert("An unknown error occurred.");
                }
                errorMessagePopup(errorData.message || "Unknown error");
            }
        });
    }

    function registerUser(username, password) {
        const requestBody = {
            username: username,
            password: password,
        };

        fetch("/users", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
        })
            .then(async (response) => {
                if (response.ok) {
                    // no token is returned
                    window.location.href = "/new_user_acknowledge_page";
                } else {
                    // Handle the error response
                    const errorData = await response.json();
                    console.error("Registration failed", errorData.message);
                    errorMessagePopup(errorData.message || "Unknown error");
                }
            })
            .catch((error) => {
                console.error("Fetch failed", error);
            });
    }

    function showConfirmationPopup(username, password) {
        Swal.fire({
            title: "Do you want to register an account now?",
            text: "You will be able to access the site's features after registration.",
            icon: "question",
            showCancelButton: true,
            confirmButtonColor: "#00b894",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes, register me!",
        }).then((result) => {
            if (result.isConfirmed) {
                registerUser(username, password);
            } else {
                console.log("User cancelled registration.");
            }
        });
    }
});
