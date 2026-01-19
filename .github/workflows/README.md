# GitHub Actions Workflows

## Download OpenFoodFacts Database

**File:** `download-openfoodfacts.yml`

### What It Does

Automatically downloads and processes the OpenFoodFacts database to get 104K+ Canadian products with pre-calculated SmartPoints.

### How to Run Manually

1. Go to your GitHub repo: https://github.com/4Ship-ca/Ultimate-Wellness
2. Click **"Actions"** tab at top
3. Click **"Download OpenFoodFacts Database"** in left sidebar
4. Click **"Run workflow"** button (top right)
5. Click green **"Run workflow"** button in dropdown
6. Wait 20-40 minutes for completion
7. Check **"Actions"** tab for progress

### What Gets Created

After successful run:
```
data/
├── products-canada.json       (~200MB) - 104K+ products
├── products-index.json        (~50MB)  - Fast lookup index
├── products-stats.json        (~5MB)   - Statistics
└── download-metadata.json     (~1KB)   - Tracking info
```

These files are automatically committed to your repository.

### Automatic Schedule

**Runs automatically:**
- 1st of every month at 2:00 AM UTC
- 15th of every month at 2:00 AM UTC

This keeps your database up-to-date with new/changed products.

### Troubleshooting

**Workflow fails:**
- Check "Actions" tab for error logs
- Common issues:
  - Network timeout (re-run workflow)
  - Disk space (GitHub provides 14GB)
  - jq not installed (workflow installs it automatically)

**Files not committed:**
- Check if workflow has write permissions
- Go to Settings → Actions → General
- Under "Workflow permissions" select "Read and write permissions"

**Can't see "Run workflow" button:**
- Make sure you're on the correct branch
- You need write access to the repository

### Manual Run on Windows

If you want to run locally on Windows instead:

1. **Install WSL (Windows Subsystem for Linux):**
   ```powershell
   wsl --install
   ```

2. **Open WSL terminal and run:**
   ```bash
   cd /mnt/d/Ultimate-Wellness/Ultimate-Wellness
   ./scripts/download-openfoodfacts.sh
   node scripts/process-products.js
   ```

3. **Or use Git Bash:**
   - Download: https://git-scm.com/download/win
   - Open Git Bash and run scripts

### Monitoring

**View progress:**
- Actions tab shows real-time logs
- See download progress (7GB file)
- See processing progress (104K products)

**Download artifacts:**
- If workflow succeeds, database files are available as artifacts
- Click workflow run → scroll to "Artifacts" section
- Download zip file with all database files

### Cost

**Free tier includes:**
- 2,000 minutes/month for private repos
- Unlimited for public repos
- Each run takes ~20-40 minutes
- 2 scheduled runs/month = 40-80 minutes used

### Disable Auto-Updates

To disable automatic updates, edit this file and remove the `schedule:` section:

```yaml
on:
  workflow_dispatch: # Keep this for manual runs
  # Remove schedule section below:
  # schedule:
  #   - cron: '0 2 1,15 * *'
```
