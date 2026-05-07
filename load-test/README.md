# k6 and Grafana Testing (No Docker)

Since you opted not to use Docker, you have two great ways to visualize the k6 test results.

## Prerequisites
1. Open PowerShell and install k6 using `winget`:
   ```bash
   winget install k6 --source winget
   ```

## Option A: Built-in k6 Web Dashboard (Easiest)
k6 comes with a beautiful web dashboard out of the box. No accounts or setup needed.

1. Start your React app in another terminal:
   ```bash
   npm run dev
   ```
2. Run the k6 script with the web dashboard enabled:
   ```bash
   k6 run --out web-dashboard=export=test-report.html k6-script.js
   ```
3. Open `http://127.0.0.1:5665` in your browser while the test is running to see the live dashboard, or open `test-report.html` when it finishes.

## Option B: Grafana Cloud
If you want the official Grafana experience:
1. Go to [Grafana Cloud](https://grafana.com/auth/sign-up/create-user) and create a free account.
2. Once logged in, go to the **Performance Testing (k6)** section.
3. It will give you a token. Run the following command to authenticate k6:
   ```bash
   k6 login cloud --token YOUR_GRAFANA_CLOUD_TOKEN_HERE
   ```
4. Run your test, sending results directly to Grafana Cloud:
   ```bash
   k6 run --out cloud k6-script.js
   ```

### Customizing the URL
By default, the script tests `https://marketplace-app-built.vercel.app/`. 
To test your local environment instead, pass the URL as an environment variable in PowerShell:
```bash
$env:TARGET_URL="http://localhost:5173"; k6 run k6-script.js
```
