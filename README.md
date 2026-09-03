# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/7b953363-1390-44a9-a1a7-6da3c6c02169

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/7b953363-1390-44a9-a1a7-6da3c6c02169) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## Spin Rush (Sonic-style platformer)

The app includes a self-contained 2D speed platformer at `/sonic`, built from scratch with the Canvas 2D API and the Web Audio API (no external game assets or libraries).

- Classic momentum physics: acceleration, friction, slopes, rolling, variable-height jumps, spin dash
- Loop-de-loops that need speed to clear, springs, spikes, one-way and moving platforms, solid blocks
- Rings (scatter on hit), item monitors (rings, shield, extra life), checkpoints, goal sign with time and ring bonus tally
- Two enemy types, lives, pause, restart, synthesized sound effects and a looping chiptune
- Keyboard (arrows/WASD, Space/Z/X, Down to roll, Down + Jump to spin dash) and on-screen touch controls

Source lives in `src/game/` (engine) and `src/pages/SonicGame.tsx` (page).

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/7b953363-1390-44a9-a1a7-6da3c6c02169) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
