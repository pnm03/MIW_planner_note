# miw planner

A calm, high-performance weekly planner for projects, tasks, and goals, featuring Supabase synchronization, theme customization, analytics, and project sharing.

Live Demo: [https://weeknote-planner.vercel.app](https://weeknote-planner.vercel.app)

---

## Features

- **Calm Weekly Planner**: Schedule tasks for specific days of the week or clear completed tasks cleanly.
- **Eisenhower Matrix**: Auto-categorize tasks into Urgent/Important quadrants for better priority management.
- **Performance Stats**: Insights on task completion rates, weekly pacing, and priority distributions.
- **Supabase Cloud Syncing**: Smooth two-way synchronization between local device storage and the cloud when logged in.
- **Account Security**: Secure login, registration, password recovery, and safe self-service account deletion.
- **Template Sharing**: Share project templates with other users via generated Base64 sharing URLs.
- **Beautiful Custom Themes**: Choose between various high-contrast newsreader serif styles, textures, and dark modes.

---

## Local Development Setup

To run this project locally, make sure you have [Node.js](https://nodejs.org/) installed, then follow these steps:

### 1. Clone the repository
```bash
git clone git@github.com:pnm03/MIW_planner_note.git
cd MIW_planner_note
```

### 2. Configure Environment Variables
Copy the `.env.example` file to create a local `.env` configuration file:
```bash
cp .env.example .env
```
Open the `.env` file and fill in your Supabase Project URL and Anon Key.

### 3. Install Dependencies
```bash
npm install
```

### 4. Run the Development Server
```bash
npm run dev
```
Open your browser and navigate to the URL shown in the terminal (usually `http://localhost:5173`).

---

## Supabase Database Setup

To enable cloud synchronization and authentication, you will need to set up a Supabase project.

### 1. Enable Email Auth
In your Supabase dashboard, go to **Authentication > Providers** and ensure that the **Email** provider is enabled. (You can turn off email confirmation for easier local development testing).

### 2. Create the Database Table
Run the following SQL in the Supabase **SQL Editor** to create the table used to store planner states:

```sql
-- Create planner_data table referencing auth users
create table public.planner_data (
  id uuid references auth.users not null primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.planner_data enable row level security;

-- Create RLS Policies to restrict access to owner only
create policy "Allow users to read their own planner data"
  on public.planner_data for select
  using (auth.uid() = id);

create policy "Allow users to insert their own planner data"
  on public.planner_data for insert
  with check (auth.uid() = id);

create policy "Allow users to update their own planner data"
  on public.planner_data for update
  using (auth.uid() = id);

create policy "Allow users to delete their own planner data"
  on public.planner_data for delete
  using (auth.uid() = id);
```

### 3. Create the Account Deletion Function (RPC)
To support the "Delete Account" button in the Settings menu (which securely removes the authenticated user's record), create this RPC database function in your Supabase SQL Editor:

```sql
-- Security Definer function runs as owner to allow users to delete themselves from auth.users
create or replace function public.delete_user_account()
returns void as $$
begin
  delete from auth.users where id = auth.uid();
end;
$$ language plpgsql security definer;
```

---

## Production Build & Deploy

To generate optimized production files:
```bash
npm run build
```
The output files will be compiled into the `dist/` directory, ready to be deployed to static hosting providers like Vercel, Netlify, or GitHub Pages.

---

## License

This project is open-sourced under the [MIT License](LICENSE).
