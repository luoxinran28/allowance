import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Define thresholds and metrics
const errorRate = new Rate('errors');
const duration = new Trend('duration');
const paymentDuration = new Trend('payment_duration');
const subscriptionDuration = new Trend('subscription_duration');

// Test configuration
export const options = {
  vus: 100,
  duration: '5m',
  thresholds: {
    errors: ['rate<0.1'],           // Error rate must be < 10%
    duration: ['p(95)<500', 'p(99)<1000'],  // 95th percentile < 500ms, 99th < 1s
    payment_duration: ['p(95)<1000'],       // Payment endpoints < 1s for p95
  },
  stages: [
    { duration: '30s', target: 20 },   // Ramp-up
    { duration: '1m30s', target: 100 }, // Peak load
    { duration: '30s', target: 0 },     // Ramp-down
  ],
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4040';
let authToken = '';

export function setup() {
  // Register a test user
  const registerRes = http.post(`${BASE_URL}/auth/register`, {
    email: `testuser${Date.now()}@example.com`,
    password: 'TestPassword123!',
  });

  check(registerRes, {
    'registration successful': (r) => r.status === 201,
  });

  // Activate user (simulate activation)
  // Note: In production, would need real activation token
  
  return {
    email: `testuser${Date.now()}@example.com`,
    password: 'TestPassword123!',
  };
}

export default function (data) {
  group('Authentication Flow', () => {
    // Login
    const loginRes = http.post(`${BASE_URL}/auth/login`, {
      email: data.email,
      password: data.password,
    });

    check(loginRes, {
      'login successful': (r) => r.status === 200,
      'login returns token': (r) => r.body.includes('access_token'),
    });

    if (loginRes.status === 200) {
      const token = JSON.parse(loginRes.body).access_token;
      authToken = token;
    } else {
      errorRate.add(1);
    }

    sleep(1);
  });

  if (authToken) {
    const headers = {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    };

    group('Payment Operations', () => {
      // Create payment intent
      const startTime = new Date();
      const intentRes = http.post(
        `${BASE_URL}/payment/create-intent`,
        {
          amount: 999,
          tier: 'pro',
          billing_period_months: 1,
        },
        { headers }
      );

      const endTime = new Date();
      paymentDuration.add(endTime - startTime);

      check(intentRes, {
        'create intent successful': (r) => r.status === 200 || r.status === 201,
        'intent has id': (r) => r.body.includes('id'),
      });

      if (intentRes.status !== 200 && intentRes.status !== 201) {
        errorRate.add(1);
      }

      sleep(1);

      // Get pricing
      const pricingRes = http.get(`${BASE_URL}/pricing`, { headers });
      check(pricingRes, {
        'pricing request successful': (r) => r.status === 200,
      });

      if (pricingRes.status !== 200) {
        errorRate.add(1);
      }

      sleep(1);
    });

    group('Subscription Operations', () => {
      // Get current subscription
      const startTime = new Date();
      const subRes = http.get(`${BASE_URL}/subscription/current`, { headers });
      const endTime = new Date();

      subscriptionDuration.add(endTime - startTime);
      duration.add(endTime - startTime);

      check(subRes, {
        'subscription request successful': (r) => r.status === 200 || r.status === 404,
      });

      if (subRes.status !== 200 && subRes.status !== 404) {
        errorRate.add(1);
      }

      sleep(1);
    });

    group('User Profile Operations', () => {
      // Get profile
      const profileRes = http.get(`${BASE_URL}/user/profile`, { headers });

      check(profileRes, {
        'profile request successful': (r) => r.status === 200,
        'profile has email': (r) => r.body.includes('email'),
      });

      if (profileRes.status !== 200) {
        errorRate.add(1);
      }

      sleep(1);

      // Get licenses
      const licensesRes = http.get(`${BASE_URL}/user/licenses`, { headers });

      check(licensesRes, {
        'licenses request successful': (r) => r.status === 200,
      });

      if (licensesRes.status !== 200) {
        errorRate.add(1);
      }

      sleep(1);
    });

    group('Health Checks', () => {
      const healthRes = http.get(`${BASE_URL}/health`);

      check(healthRes, {
        'health check successful': (r) => r.status === 200,
      });

      const readyRes = http.get(`${BASE_URL}/health/ready`);
      check(readyRes, {
        'ready check successful': (r) => r.status === 200,
      });

      const detailedRes = http.get(`${BASE_URL}/health/detailed`);
      check(detailedRes, {
        'detailed health successful': (r) => r.status === 200,
      });

      sleep(1);
    });
  }

  sleep(1);
}

export function handleSummary(data) {
  return {
    '/tmp/summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  let summary = '\n=== Load Test Results ===\n';
  
  for (const [key, value] of Object.entries(data.metrics)) {
    summary += `${key}: ${JSON.stringify(value.value || value.values)}\n`;
  }

  return summary;
}
