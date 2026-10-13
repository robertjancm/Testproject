# Taskflow

A lightweight Kanban board for keeping a team's work moving. Create and edit tasks, organize them into **To do**, **In progress**, and **Done**, and drag cards between columns to update their status. Search and filter tasks by priority to find the work that needs attention.

## Run locally

Open `index.html` in a modern browser. No build step, account, or dependencies are required.

## Publish with GitHub Pages

The workflow in `.github/workflows/pages.yml` deploys the site whenever changes are pushed to `main`. In the repository's **Settings → Pages**, set the build and deployment source to **GitHub Actions**. After the first successful deployment, the site will be available at `https://robertjancm.github.io/Testproject/`.

Tasks are saved in the browser's local storage on the device where you use the board. Visitors share the app, but do not share task data. The board starts with sample tasks; edit or delete them, or add your own.
