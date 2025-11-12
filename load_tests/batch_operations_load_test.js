import http from 'k6/http';
import { check, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const batchDuration = new Trend('batch_duration');
const errorRate = new Rate('batch_errors');

export const options = {
  vus: 50,
  duration: '3m',
  thresholds: {
    batch_errors: ['rate<0.15'],
    batch_duration: ['p(95)<2000'],  // 2 seconds for batch operations
  },
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:4040';
let adminToken = '';

export function setup() {
  // Setup admin user
  const adminRes = http.post(`${BASE_URL}/auth/register`, {
    email: `admin${Date.now()}@example.com`,
    password: 'AdminPassword123!',
  });

  return {
    email: `admin${Date.now()}@example.com`,
    password: 'AdminPassword123!',
  };
}

export default function (data) {
  group('Batch License Operations', () => {
    // Login
    const loginRes = http.post(`${BASE_URL}/auth/login`, {
      email: data.email,
      password: data.password,
    });

    if (loginRes.status === 200) {
      adminToken = JSON.parse(loginRes.body).access_token;
    } else {
      errorRate.add(1);
      return;
    }

    const headers = {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    };

    // Test batch license generation with varying sizes
    const batchSizes = [10, 50, 100];
    
    for (const size of batchSizes) {
      const startTime = new Date();
      const batchRes = http.post(
        `${BASE_URL}/licenses/batch/generate`,
        {
          product_id: 'form-001',
          quantity: size,
          tier: 'pro',
          days_valid: 30,
        },
        { headers }
      );
      const endTime = new Date();

      batchDuration.add(endTime - startTime);

      check(batchRes, {
        'batch generation successful': (r) => r.status === 200,
        'batch returns correct quantity': (r) => {
          try {
            const body = JSON.parse(r.body);
            return body.total_generated === size;
          } catch {
            return false;
          }
        },
        'batch has batch_id': (r) => r.body.includes('batch_id'),
      });

      if (batchRes.status !== 200) {
        errorRate.add(1);
      }
    }

    // Test batch export
    const exportRes = http.post(
      `${BASE_URL}/licenses/batch/export`,
      {
        tier: 'pro',
        product_id: 'form-001',
      },
      { headers }
    );

    check(exportRes, {
      'export successful': (r) => r.status === 200,
      'export returns CSV': (r) => r.headers['Content-Type'] === 'text/csv',
    });

    if (exportRes.status !== 200) {
      errorRate.add(1);
    }
  });
}
