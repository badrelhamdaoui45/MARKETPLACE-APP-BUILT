import http from 'k6/http';
import { check, sleep } from 'k6';

// Read URL from environment variable, default to live Vercel URL
const BASE_URL = __ENV.TARGET_URL || 'https://marketplace-app-built.vercel.app/';

export const options = {
  // A simple test with 10 virtual users for 30s
  stages: [
    { duration: '5s', target: 5 },  // Ramp up to 5 users
    { duration: '15s', target: 10 }, // Stay at 10 users
    { duration: '10s', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests must complete below 500ms
  },
};

export default function () {
  // Test the main homepage
  let res = http.get(BASE_URL);
  
  check(res, {
    'homepage status is 200': (r) => r.status === 200,
  });

  sleep(1);

  // You can add more endpoints here
  // let albumsRes = http.get(`${BASE_URL}/albums`);
  // check(albumsRes, { 'albums status is 200': (r) => r.status === 200 });
}
