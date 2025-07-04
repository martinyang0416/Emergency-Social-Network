import { initializeSocket, handleSpeedTestEvent} from "./utils/socketUtils.js";
import { logout, verifyTokenAndRedirect } from "./utils/authUtils.js";


document.addEventListener("DOMContentLoaded", function () {
    const token = sessionStorage.getItem('token');
    const username = sessionStorage.getItem('username');
    const userid = sessionStorage.getItem('userid');
    const userstatus = sessionStorage.getItem('citizenStatus');

    // Form elements
    const incidentForm = document.getElementById('incidentForm');
    const titleInput = document.getElementById('incident-title');
    const detailsInput = document.getElementById('incident-details');
    const imageInput = document.getElementById('incident-images');
    const resourceInput = document.getElementById('resource-details');
    const resourceImageInput = document.getElementById('resource-images');
    const container = document.getElementById('container');
    // Select the report button
    const reportButton = document.getElementById("reportIncidentButton");

    verifyTokenAndRedirect(token);

    const socket = initializeSocket();

    socket.on("connect", () => {
        console.log("Socket connected:", socket.id);
    });
    socket.on("connect_error", (err) => {
        console.error("Socket connection error:", err);
    });


    let incidentImageFiles = [];
    let resourceImageFiles = [];

    socket.on('newIncident', function (data) {
        console.log('new events', data);

        if (container) {
            container.innerHTML = ''; // Clears all content inside the container
        }
        fetchAndDisplayIncidents();
    });

    socket.on('deleteIncident',  function (id) {
        console.log('The post has been deleted', id);

        if (container) {
            container.innerHTML = ''; // Clears all content inside the container
        }
        fetchAndDisplayIncidents();
    });

    socket.on("newComment", async function (data) {
        console.log("New comment received via Socket.IO:", data);
    
        const postId = data.incidentPost_id;
    
        // Fetch updated comments
        const comments = await fetchComments(postId);
    
        // Find the currently opened modal (if any) and update its comments
        const commentsList = document.querySelector(".comments-modal .comments-list");
        if (commentsList) {
            renderComments(comments, commentsList);
            scrollToBottom(commentsList); // Ensure it scrolls to the most recent comment
        }
    });

    handleSpeedTestEvent(socket, logout);

    // Initialize character counters
    setupCharacterCounter(titleInput, 'title-char-count', 100);
    setupCharacterCounter(detailsInput, 'details-char-count', 1500);

    // Setup file input handlers with preview
    setupFileInputWithPreview(imageInput, 'incident-preview', true);
    setupFileInputWithPreview(resourceImageInput, 'resource-preview', false);


    fetchAndDisplayIncidents();

    function fetchAndDisplayIncidents() {
        fetch('/posts/incidents', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        })
        .then(async response => {
            if (!response.ok) {
                // Parse the error response and throw an error
                const err = await response.json();
                throw new Error(`Failed to fetch incidents: ${err.message}`);
            }
            return response.json(); // Parse the successful response
        })
        .then(data => {
            // Ensure the data matches the expected format
            if (!Array.isArray(data.data)) {
                throw new Error('Unexpected response format');
            }

            console.log("incidents", data.data);

            // Call createIncidentCard for each incident
            data.data.forEach(emittedData => {
                createIncidentCard(emittedData);
            });
        })
        .catch(error => {
            console.error('Error fetching and displaying incidents:', error);
        });
    }


    // Attach a click event to the button to reset the form
    reportButton.addEventListener("click", () => {
        // Reset the form fields
        incidentForm.reset();

        // Clear image previews
        document.getElementById("incident-preview").innerHTML = "";
        document.getElementById("resource-preview").innerHTML = "";

        // Clear any temporary data like uploaded file arrays
        incidentImageFiles.length = 0;
        resourceImageFiles.length = 0;

        // Reset form state (important for updating functionality)
        isUpdate = false;
        currentIncidentId = null;

        console.log("Form reset and ready for new incident report.");
    });


    // File handling utilities
    const FileUploadService = {
        generateUniqueKey: (folder, fileName) => {
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 15);
            return `${folder}/${timestamp}-${randomString}-${fileName}`;
        },

        prepareFilesForUpload: (files, folder) => {
            return files.map(file => ({
                uniqueKey: FileUploadService.generateUniqueKey(folder, file.name),
                fileType: file.type,
                file
            }));
        },

        getUploadUrls: async (filesWithKeys, token) => {
            const response = await fetch('/posts/upload_urls', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    files: filesWithKeys.map(({ uniqueKey, fileType }) => ({
                        fileName: uniqueKey,
                        fileType
                    }))
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get upload URLs');
            }

            return response.json();
        },

        uploadFiles: async (files, folder, formData, token) => {
            if (!files.length) return [];

            const filesWithKeys = FileUploadService.prepareFilesForUpload(files, folder);
            const formDataKey = folder === 'incident-images' ? 'incidentImages' : 'resourceImages';
            
            filesWithKeys.forEach(file => {
                formData.append(formDataKey, file.uniqueKey);
            });

            const { uploadUrls } = await FileUploadService.getUploadUrls(filesWithKeys, token);

            await Promise.all(
                uploadUrls.map(async ({ fileName, uploadUrl }) => {
                    const fileObject = filesWithKeys.find(f => f.uniqueKey === fileName);
                    const uploadResponse = await fetch(uploadUrl, {
                        method: 'PUT',
                        body: fileObject.file,
                        headers: {
                            'Content-Type': fileObject.fileType
                        }
                    });

                    if (!uploadResponse.ok) {
                        throw new Error(`Failed to upload ${fileObject.file.name}`);
                    }
                })
            );

            return uploadUrls.map(({ fileName }) => fileName);
        }
    };

    // Form data handling
    const FormDataService = {
        createFormData: (inputs, username, userid) => {
            const formData = new FormData();
            
            formData.append('incidentTitle', inputs.title.trim());
            formData.append('incidentDetails', inputs.details.trim());
            formData.append('resourceDetails', inputs.resource.trim());
            formData.append('username', username);
            formData.append('userid', userid);
            formData.append('userstatus', sessionStorage.getItem('citizenStatus'));

            return formData;
        },

        convertFormDataToJson: (formData) => {
            const jsonObject = {};
            for (const [key, value] of formData.entries()) {
                if (jsonObject[key]) {
                    jsonObject[key] = [].concat(jsonObject[key], value);
                } else {
                    jsonObject[key] = value;
                }
            }
            return JSON.stringify(jsonObject);
        }
    };

    // UI Management
    const UIManager = {
        showLoading: (isUpdate) => {
            return Swal.fire({
                title: isUpdate ? 'Updating...' : 'Submitting...',
                text: isUpdate ? 'Please wait while we update your incident report.' 
                            : 'Please wait while we submit your incident report.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });
        },

        showSuccess: async (isUpdate) => {
            await Swal.fire({
                title: 'Success!',
                text: isUpdate ? 'Incident report updated successfully' 
                            : 'Incident report submitted successfully',
                icon: 'success',
                confirmButtonText: 'OK'
            });
        },

        showError: async (error) => {
            await Swal.fire({
                title: 'Error!',
                text: error.message,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        },

        resetForm: (formElement) => {
            formElement.reset();
            document.getElementById('incident-preview').innerHTML = '';
            document.getElementById('resource-preview').innerHTML = '';
        },

        closeModal: () => {
            const modalElement = document.getElementById('incidentModal');
            modalElement.style.display = 'none';
            document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }
    };

    // Main form submission handler
    async function handleFormSubmission(e, {
        incidentForm,
        titleInput,
        detailsInput,
        resourceInput,
        incidentImageFiles,
        resourceImageFiles,
        username,
        userid,
        token,
        isUpdate,
        currentIncidentId,
        validateForm
    }) {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            UIManager.showLoading(isUpdate);

            const formData = FormDataService.createFormData(
                {
                    title: titleInput.value,
                    details: detailsInput.value,
                    resource: resourceInput.value
                },
                username,
                userid
            );

            await FileUploadService.uploadFiles(incidentImageFiles, 'incident-images', formData, token);
            await FileUploadService.uploadFiles(resourceImageFiles, 'resource-documents', formData, token);

            const jsonData = FormDataService.convertFormDataToJson(formData);
            
            const url = isUpdate ? `/posts/incidents/${currentIncidentId}` : '/posts/incidents';
            const response = await fetch(url, {
                method: isUpdate ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: jsonData
            });

            if (!response.ok) {
                throw new Error('Failed to submit incident report');
            }

            Swal.close();
            await UIManager.showSuccess(isUpdate);

            UIManager.resetForm(incidentForm);
            UIManager.closeModal();
            location.reload();

        } catch (error) {
            console.error('Error submitting form:', error);
            Swal.close();
            await UIManager.showError(error);
        }
    }

    // Usage
    incidentForm.addEventListener('submit', (e) => 
        handleFormSubmission(e, {
            incidentForm,
            titleInput,
            detailsInput,
            resourceInput,
            incidentImageFiles,
            resourceImageFiles,
            username,
            userid,
            token,
            isUpdate,
            currentIncidentId,
            validateForm
        })
    );
    
    
    
    function setupCharacterCounter(input, counterId, limit) {
        const counter = document.getElementById(counterId);

        function updateCount() {
            const currentLength = input.value.length;
            counter.textContent = `${currentLength}/${limit} characters`;

            counter.classList.remove('warning', 'limit');
            if (currentLength >= limit) {
                counter.classList.add('limit');
            } else if (currentLength >= limit * 0.9) {
                counter.classList.add('warning');
            }
        }

        input.addEventListener('input', updateCount);
        updateCount();
    }

    function setupFileInputWithPreview(input, previewContainerId, allowCompression) {
        const previewContainer = document.getElementById(previewContainerId);

        input.addEventListener('change', function () {
            handleFileSelect(this.files, previewContainer, this, allowCompression);
        });
    }

    function handleFileSelect(files, previewContainer, inputElement) {
        // Clear existing previews if this is a new selection and not multiple
        if (!inputElement.multiple) {
            previewContainer.innerHTML = '';
        }

        Array.from(files).forEach(file => {
            if (!file.type.startsWith('image/')) {
                Swal.fire({
                    title: 'Invalid File Type',
                    text: 'Please upload only image files',
                    icon: 'error',
                    confirmButtonText: 'OK'
                });
                return;
            }

            // Add the file to the appropriate array
            if (previewContainer.id === 'incident-preview') {
                incidentImageFiles.push(file);
            } else {
                resourceImageFiles.push(file);
            }

            const previewWrapper = document.createElement('div');
            previewWrapper.className = 'preview-wrapper';

            // Create image preview
            const img = document.createElement('img');
            img.className = 'preview-image';

            const reader = new FileReader();
            reader.onload = function (e) {
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);

            // Create remove button
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-preview';
            removeBtn.innerHTML = '×';
            removeBtn.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                previewWrapper.remove();

                // Remove file from input
                const dt = new DataTransfer();
                const updatedFiles = Array.from(inputElement.files).filter(f => f !== file);
                updatedFiles.forEach(f => dt.items.add(f));
                inputElement.files = dt.files;

                // Remove the file from the appropriate array
                if (previewContainer.id === 'incident-preview') {
                    incidentImageFiles = incidentImageFiles.filter(f => f !== file);
                } else {
                    resourceImageFiles = resourceImageFiles.filter(f => f !== file);
                }
            };

            // Create file info
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            fileInfo.textContent = `${file.name} (${formatFileSize(file.size)})`;

            // Assemble preview
            previewWrapper.appendChild(img);
            previewWrapper.appendChild(removeBtn);
            previewWrapper.appendChild(fileInfo);
            previewContainer.appendChild(previewWrapper);
        });

        // Reset input value to allow selecting the same file again
        inputElement.value = '';

    }

    function validateForm() {
        let isValid = true;

        if (!titleInput.value.trim()) {
            isValid = false;
            titleInput.classList.add('invalid');
        } else {
            titleInput.classList.remove('invalid');
        }

        if (!detailsInput.value.trim()) {
            isValid = false;
            detailsInput.classList.add('invalid');
        } else {
            detailsInput.classList.remove('invalid');
        }

        if (incidentImageFiles.length == 0) {
            isValid = false;
            Swal.fire({
                title: 'Error!',
                text: 'Please upload at least one image.',
                icon: 'error',
                confirmButtonText: 'OK'
            });
        }

        return isValid;
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Components for building card elements
    const createCarouselElements = (id, images) => {
        const indicators = images
            .map((_, index) => `
                <button 
                    type="button" 
                    data-bs-target="#incidentCarousel-${id}" 
                    data-bs-slide-to="${index}" 
                    class="${index === 0 ? "active" : ""}" 
                    aria-label="Slide ${index + 1}">
                </button>
            `).join("");

        const slides = images
            .map((img, index) => `
                <div class="carousel-item ${index === 0 ? "active" : ""}">
                    <img src="${img}" class="d-block w-100" alt="Incident Image ${index + 1}">
                </div>
            `).join("");

        return { indicators, slides };
    };

    const createCardHeader = (title) => `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <h4 class="card-title m-0">
                <span id="incidentPostPrefix" class="prefix">Incident:</span>
                <span id="dynamicContent">${title}</span>
            </h4>
            <div class="dropdown">
                <span
                    class="material-symbols-outlined"
                    style="cursor: pointer; color: black;"
                    id="dropdownMenuLink"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                >
                    more_vert
                </span>
                <ul class="dropdown-menu" aria-labelledby="dropdownMenuLink">
                    <li><a class="dropdown-item" href="#action1">Update</a></li>
                    <li><a class="dropdown-item" href="#action2">Delete</a></li>
                </ul>
            </div>
        </div>
    `;

    const createPostContent = (username, details, timeText) => `
        <div class="post-content mt-2">
            <div class="d-flex align-items-start mb-3">
                <button id="status-button" class="status-icon" type="button" aria-haspopup="true" aria-expanded="true">
                    <span id="status-icon" class="material-symbols-outlined"></span>
                </button>
                <div class="post-info">
                    <span class="username">${username}</span>
                    <span class="post-text">${details}</span>
                </div>
            </div>
            <span class="time-text">${timeText}</span>
        </div>
    `;

    // Event handlers
    const handleDelete = async (id, card, token) => {
        const confirmation = await Swal.fire({
            title: "Are you sure?",
            text: "This action cannot be undone.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, delete it!",
        });

        if (!confirmation.isConfirmed) return;

        try {
            const response = await fetch(`/posts/incidents/${id}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to delete the incident. Status: ${response.status}`);
            }

            await Swal.fire("Deleted!", "The incident has been deleted.", "success");
            card.remove();
        } catch (error) {
            console.error("Error deleting incident:", error);
            await Swal.fire("Error!", "Failed to delete the incident. Please try again.", "error");
        }
    };

    const handleComments = async (id, token) => {
        const modal = showCommentsPopup(id);
        const commentsList = modal.querySelector(".comments-list");
        const comments = await fetchComments(id);
        renderComments(comments, commentsList);

        modal.querySelector(".add-comment-button").addEventListener("click", async () => {
            const commentInput = modal.querySelector(".comment-input");
            const newCommentText = commentInput.value.trim();

            if (!newCommentText) {
                alert("Please enter a comment before submitting.");
                return;
            }

            try {
                const response = await fetch(`/posts/incidents/${id}/comments`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        text: newCommentText,
                        sender_name: sessionStorage.getItem("username"),
                        sender_status: sessionStorage.getItem("citizenStatus"),
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Failed to post comment. Status: ${response.status}`);
                }

                commentInput.value = "";
            } catch (error) {
                console.error("Error adding comment:", error);
                alert("Failed to add comment. Please try again.");
            }
        });
    };

    // Main function
    async function createIncidentCard(emittedData) {
        const {
            id,
            title,
            details,
            incidentImages: fileNames,
            resourceDetails,
            resourceImages = [],
            username,
            userstatus,
            timestamp,
        } = emittedData;

        // Fetch image URLs
        const incidentImages = await fetchIncidentImages(fileNames, "incident-images");
        const resourceImageList = resourceImages.length > 0
            ? await fetchIncidentImages(resourceImages, "resource-documents")
            : [];

        const timeText = timeAgo(timestamp);
        const container = document.getElementById("container");
        
        // Create card element
        const card = document.createElement("div");
        card.classList.add("card");
        card.dataset.id = id;

        // Build carousel elements
        const { indicators, slides } = createCarouselElements(id, incidentImages);

        // Construct card HTML
        card.innerHTML = `
            <div class="card-body">
                ${createCardHeader(title)}
                
                <div id="incidentCarousel-${id}" class="carousel slide incident-image mb-3" data-bs-ride="carousel">
                    <div class="carousel-indicators">${indicators}</div>
                    <div class="carousel-inner">${slides}</div>
                    
                    <button class="carousel-control-prev" type="button" data-bs-target="#incidentCarousel-${id}" data-bs-slide="prev">
                        <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                        <span class="visually-hidden">Previous</span>
                    </button>
                    <button class="carousel-control-next" type="button" data-bs-target="#incidentCarousel-${id}" data-bs-slide="next">
                        <span class="carousel-control-next-icon" aria-hidden="true"></span>
                        <span class="visually-hidden">Next</span>
                    </button>
                </div>
                
                <div class="comment-section">
                    <div class="interaction-row d-flex justify-content-between align-items-center mb-3">
                        <button class="navigate-button" id="resourceDetailsButton-${id}">
                            <span class="material-symbols-outlined">volunteer_activism</span>
                        </button>
                        <a href="#" class="navigate-button" id="shareButton-${id}">
                            <span class="material-symbols-outlined">share</span>
                        </a>
                    </div>
                    
                    ${createPostContent(username, details, timeText)}
                    
                    <div class="view-comments mt-2">
                        <a href="#" class="comments-link">View all comments</a>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(card);

        // Set up status icon
        const statusIcon = card.querySelector("#status-icon");
        updateStatusIcon(userstatus, statusIcon);

        // Add event listeners
        card.querySelector(".dropdown-item[href='#action1']").addEventListener("click", (event) => {
            event.preventDefault();
            openUpdateModal({
                id,
                title,
                details,
                incidentImages: incidentImages.map((img) => img),
                resourceDetails,
                resourceImages: resourceImageList,
            });
        });

        card.querySelector(".dropdown-item[href='#action2']").addEventListener("click", (event) => {
            event.preventDefault();
            handleDelete(id, card, token);
        });

        card.querySelector(".comments-link").addEventListener("click", (event) => {
            event.preventDefault();
            handleComments(id, token);
        });

        document.getElementById(`resourceDetailsButton-${id}`).addEventListener("click", () => {
            showResourcePopup(resourceDetails, resourceImageList);
        });

        document.getElementById(`shareButton-${id}`).addEventListener("click", (event) => {
            event.preventDefault();
            displayFakeCopyNotification();
        });
    }


    async function fetchComments(postId) {
        try {
            const response = await fetch(`/posts/incidents/${postId}/comments`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
    
            if (!response.ok) {
                throw new Error(`Failed to fetch comments. Status: ${response.status}`);
            }
    
            const { data: commentsArray } = await response.json();
    
            // Validate the response format
            if (!Array.isArray(commentsArray)) {
                throw new Error("Unexpected response format: Expected an array of comments.");
            }
    
            return commentsArray;
        } catch (error) {
            console.error("Error fetching comments:", error);
            return []; // Return an empty array on error
        }
    }
    

    function renderComments(comments, container) {
        if (!container) {
            console.error("Comments container not found");
            return;
        }
    
        if (!Array.isArray(comments) || comments.length === 0) {
            container.innerHTML = `<p class="no-comments">No comments yet. Be the first to comment!</p>`;
            return;
        }
    
        container.innerHTML = comments
            .map(
                (comment) => `
                    <div class="comment-item">
                        <strong class="comment-sender">${comment.name || "Unknown"}</strong>
                        <span class="comment-time">${timeAgo(comment.time || new Date().toISOString())}</span>
                        <p class="comment-text">${comment.text || "No content available."}</p>
                    </div>
                `
            )
            .join("");
    }
    

    // Helper function to scroll to the bottom
    function scrollToBottom(container) {
        if (container) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 100); // Allow time for DOM updates to complete
        }
    }
        
    function showCommentsPopup(postId) {
        // Remove any existing modal
        const existingModal = document.querySelector(".comments-modal");
        if (existingModal) {
            existingModal.remove();
        }
    
        // Create modal structure
        const modal = document.createElement("div");
        modal.classList.add("comments-modal");
    
        modal.innerHTML = `
            <div class="comments-modal-overlay"></div>
            <div class="comments-modal-container">
                <div class="comments-modal-header">
                    <h4>Comments</h4>
                    <span class="close-modal">&times;</span>
                </div>
                <div class="comments-list"></div>
                <div class="add-comment-section">
                    <textarea
                        class="comment-input"
                        placeholder="Type your comment..."
                        rows="3"
                    ></textarea>
                    <button class="add-comment-button">Add Comment</button>
                </div>
            </div>
        `;
    
        document.body.appendChild(modal);
    
        const commentsList = modal.querySelector(".comments-list");
    
        // Fetch comments and render them, then scroll to the bottom
        fetchComments(postId).then((comments) => {
            renderComments(comments, commentsList);
            scrollToBottom(commentsList); // Ensure it scrolls after rendering
        });

        modal.querySelector(".close-modal").addEventListener("click", () => modal.remove());
        modal.querySelector(".comments-modal-overlay").addEventListener("click", () => modal.remove());
    
        return modal;
    }
    
    

    let isUpdate = false; // Flag to differentiate create vs. update
    let currentIncidentId = null; // Store the ID for the incident being updated

    // Function to open the modal for update
    function openUpdateModal(data) {
        isUpdate = true; // Mark the operation as update
        currentIncidentId = data.id; // Set the current incident ID

        // Populate form fields with existing data
        titleInput.value = data.title || '';
        detailsInput.value = data.details || '';
        resourceInput.value = data.resourceDetails || '';

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('incidentModal'));
        modal.show();
    }

    // Function to update the icon based on the citizenStatus
    function updateStatusIcon(citizenStatus, iconElement) {
        switch (citizenStatus) {
            case "OK":
                iconElement.textContent = "check_circle";
                iconElement.style.color = "green";
                break;
            case "Help":
                iconElement.textContent = "warning";
                iconElement.style.color = "yellow";
                break;
            case "Emergency":
                iconElement.textContent = "e911_emergency";
                iconElement.style.color = "red";
                break;
            default:
                iconElement.textContent = "help_center";
                iconElement.style.color = "lightgrey";
                break;
        }
    }
    

    function displayFakeCopyNotification(message = "URL copied to clipboard!") {
        // Create the notification element
        const fakeCopyScreen = document.createElement("div");
        fakeCopyScreen.innerHTML = message;
        fakeCopyScreen.style = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #fff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            z-index: 1000;
            text-align: center;
        `;
        document.body.appendChild(fakeCopyScreen);
    
        // Remove the notification after 2 seconds
        setTimeout(() => {
            document.body.removeChild(fakeCopyScreen);
        }, 2000);
    }    
    
    
    // Constants for reuse
    const MODAL_ID = 'resourceModal';
    const MODAL_TEMPLATE = {
        maxImageHeight: '400px',
        objectFit: 'contain'
    };

    // Component generators
    const createCarouselContent = (images) => {
        if (!images || images.length === 0) return '';
        
        const slides = images
            .map((img, index) => `
                <div class="carousel-item ${index === 0 ? 'active' : ''}">
                    <img 
                        src="${img}" 
                        class="d-block mx-auto img-fluid" 
                        alt="Resource Image ${index + 1}" 
                        style="max-height: ${MODAL_TEMPLATE.maxImageHeight}; object-fit: ${MODAL_TEMPLATE.objectFit};"
                    >
                </div>`
            )
            .join('');

        return `
            <div id="resourceCarousel" class="carousel slide" data-bs-ride="carousel">
                <div class="carousel-inner">
                    ${slides}
                </div>
                <button class="carousel-control-prev" type="button" data-bs-target="#resourceCarousel" data-bs-slide="prev">
                    <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Previous</span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#resourceCarousel" data-bs-slide="next">
                    <span class="carousel-control-next-icon" aria-hidden="true"></span>
                    <span class="visually-hidden">Next</span>
                </button>
            </div>
        `;
    };

    const createModalBody = (details, images) => {
        const hasDetails = details?.trim();
        const hasImages = images?.length > 0;

        if (!hasDetails && !hasImages) {
            return '<p class="text-center text-muted">No resource details or images are available.</p>';
        }

        return `
            ${hasDetails ? `<p><strong>Details:</strong> ${details}</p>` : ''}
            ${hasImages ? createCarouselContent(images) : ''}
        `;
    };

    const createModalContent = (details, images) => `
        <div class="modal fade" id="${MODAL_ID}" tabindex="-1" aria-labelledby="${MODAL_ID}Label" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="${MODAL_ID}Label">Resource Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        ${createModalBody(details, images)}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Modal cleanup handler
    const handleModalCleanup = (modalContainer) => {
        // Remove modal from DOM
        modalContainer.remove();

        // Reset body styles
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';

        // Remove any lingering backdrops
        document.querySelectorAll('.modal-backdrop').forEach(backdrop => backdrop.remove());
    };

    // Main function
    function showResourcePopup(details, images) {
        try {
            // Create and append modal
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = createModalContent(details, images);
            document.body.appendChild(modalContainer);

            // Initialize and show modal
            const modal = new bootstrap.Modal(document.getElementById(MODAL_ID));
            modal.show();

            // Set up cleanup listener
            const modalElement = document.getElementById(MODAL_ID);
            modalElement.addEventListener('hidden.bs.modal', () => handleModalCleanup(modalContainer));

            return modal;
        } catch (error) {
            console.error('Error showing resource popup:', error);
            throw new Error('Failed to show resource popup');
        }
    }

    

      async function fetchIncidentImages(fileNames, folder) {
        try {
            const response = await fetch("/posts/download_urls", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ fileNames, folder }), // Include folder in the body
            });
    
            console.log("Response object:", response); // Log the response object
    
            if (!response.ok) {
                console.error("Response status:", response.status);
                throw new Error("Failed to fetch image URLs");
            }
    
            const data = await response.json();
            console.log("Response JSON:", data); // Log the parsed JSON response
            return data.downloadUrls.map((item) => item.downloadUrl);
        } catch (error) {
            console.error("Error fetching incident images:", error);
            return []; // Return an empty array if there's an error
        }
    }
    
    function timeAgo(timestamp) {
        // Parse the provided timestamp (assumed to be in UTC)
        const messageDate = new Date(timestamp); // The timestamp is in UTC and will be converted to local time
    
        // Check if the timestamp is valid
        if (isNaN(messageDate)) {
            throw new Error('Invalid timestamp format');
        }
    
        // Get the current system time (local time)
        const now = new Date(); // Local system time (current time)
    
        // Calculate the difference between the current time (local) and the message time (UTC converted to local)
        const timeDifference = now - messageDate; // Difference in milliseconds
    
        // Convert the difference into seconds, minutes, hours, days
        const seconds = Math.floor(timeDifference / 1000);
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
    
        // Return the relative time difference as a human-readable string
        if (days > 0) {
            return `${days} day${days > 1 ? 's' : ''} ago`;
        } else if (hours > 0) {
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else if (minutes > 0) {
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else {
            return `${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''} ago`;
        }
    }    

});