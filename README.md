# UPDATE NOTE
Sigrid is now enabled for this repo.
You have new GitHub Actions workflow files.
Accept your Sigrid invitation and review the analysis of your repo.
Visit Sigrid at https://sigrid-says.com/cmusvfse

# Emergency Social Network (ESN) Project

## Project Overview

This repository contains the codebase and documentation for the **Emergency Social Network (ESN)**, a web-based social networking platform designed to assist small communities of civilians during natural disasters. The platform enables users to communicate and coordinate effectively in the event of emergencies such as earthquakes, wildfires, or tsunamis.

The goal of ESN is to create a system that prioritizes ease of use, accessibility, and responsiveness, especially for users accessing the platform through mobile devices.

## Technology Stack

We have chosen the following technologies for the development of this project, carefully balancing ease of use, performance, and maintainability:

### Front-End

- **HTML5**, **CSS3**, **JavaScript**: The core web technologies used for building the user interface. These technologies provide a simple, universally supported way to create responsive and accessible front-end pages.
- **Bootstrap**: We are using Bootstrap to speed up the design process and ensure that the application is responsive. Bootstrap offers pre-built components that help create a mobile-first, clean design, which is essential in an emergency social network.

### Back-End

- **Node.js**: Node.js is being used for server-side operations. Its event-driven, non-blocking nature makes it well-suited for real-time communication, which is critical for this project.
- **Express.js**: A lightweight framework for Node.js, Express simplifies routing, middleware, and server management, making it easier to implement the back-end logic.

### Database

- **MySQL**: MySQL is the database of choice due to its stability and efficient handling of relational data. It will store user data, communication logs, and other critical information in a secure and consistent manner.

### Communication Between Tiers

- **REST API**: We are implementing a RESTful API for communication between the front-end and back-end. This approach ensures that the system is scalable and easy to maintain, with a clear separation of responsibilities between the client and server.

## Rationale for Technology Choices

1. **Simplicity and Accessibility**: The chosen front-end stack ensures that the application remains lightweight and responsive, while **Bootstrap** provides an easy way to ensure mobile accessibility without adding complexity.
   
2. **Backend Efficiency**: The combination of **Node.js** and **Express.js** allows for a fast and scalable server environment, perfect for handling real-time data in an emergency situation.

3. **Database Integration**: **MySQL** provides robust and efficient data management for this project. It offers strong consistency, ensuring that user data and logs are stored securely and reliably during an emergency.

4. **RESTful Communication**: A **REST API** offers flexibility and simplicity for communication between the client and server, ensuring a stateless architecture that is easy to scale.

## Strengths, Weaknesses, and Gaps of Selected Technologies

### Front-End

- **HTML5, CSS3, JavaScript**
  - **Strengths**: Simple, widely supported, and compatible with all modern browsers. These technologies offer great flexibility in building user interfaces.
  - **Weaknesses**: Manual design can be tedious without modern front-end frameworks.
  - **Knowledge Gaps**: Some team members have limited experience with responsive design. Internal workshops have been organized to address this.

- **Bootstrap**
  - **Strengths**: Provides a framework for responsive, mobile-first design. It saves time by offering pre-built components.
  - **Weaknesses**: Can limit design flexibility and create a generic appearance.
  - **Knowledge Gaps**: Some team members are new to Bootstrap, but they are currently undergoing training sessions to familiarize themselves with its features.

### Back-End

- **Node.js**
  - **Strengths**: Asynchronous, event-driven architecture ideal for real-time communication. Scalable and efficient.
  - **Weaknesses**: Can be challenging for handling CPU-intensive tasks, though this is not a concern for our project.
  - **Knowledge Gaps**: Some team members need to improve their understanding of asynchronous programming in Node.js. They are working through online courses and receiving mentorship from experienced developers.

- **Express.js**
  - **Strengths**: A lightweight framework that simplifies routing and server management.
  - **Weaknesses**: Requires additional libraries for complex features, but our project scope does not require these.
  - **Knowledge Gaps**: Some team members are unfamiliar with routing in Express. To address this, we have conducted code reviews and practice sessions.

### Database

- **MySQL**
  - **Strengths**: Robust and efficient for managing relational data. Offers strong consistency and data integrity.
  - **Weaknesses**: Limited flexibility for non-relational data, but this is not a significant issue for our project.
  - **Knowledge Gaps**: Some team members are less experienced with SQL and relational databases. Workshops and tutorials have been conducted to cover database design and query optimization.

### Communication

- **REST API**
  - **Strengths**: REST is simple, scalable, and stateless. It’s well-suited for this project’s needs.
  - **Weaknesses**: Can be less efficient for complex data retrieval, but this is not a concern given the nature of our application.
  - **Knowledge Gaps**: Experience levels vary among team members, so we are holding regular code reviews to ensure that everyone is comfortable with API design.

## Steps to Address Knowledge Gaps

- **Internal Workshops**: Team members have organized workshops to learn technologies like Bootstrap, Node.js asynchronous programming, and SQL database management.
- **Mentorship and Code Reviews**: Experienced team members are mentoring those who are less familiar with certain technologies, conducting pair programming and code reviews to ensure skill development.
- **Online Courses**: Some members are completing courses on topics like asynchronous programming and API design to close knowledge gaps.
- **Regular Check-ins**: We hold regular meetings to track progress on skill development and ensure that all team members are up to speed.

## Collaboration and Responsibility

We have adhered to the project's warning about imposing heavy-weight technologies. The selected stack was chosen collaboratively, with careful consideration of each team member’s skills and experiences. Each member is taking action to close any knowledge gaps to ensure the successful completion of the project. Mentorship, workshops, and resource sharing are part of our team's strategy to ensure that no one is left behind.
