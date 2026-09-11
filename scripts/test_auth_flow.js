const base = 'http://localhost:3000';

async function runTests() {
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log('PASS:', message);
      passed++;
    } else {
      console.error('FAIL:', message);
      failed++;
    }
  }

  console.log('--- STARTING FARMGRID AUTH & OTP FLOW VERIFICATION ---');

  // Test 7: Duplicate email
  let res = await fetch(base + '/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'farmer@farmgrid.demo', password: 'Password@123', role: 'farmer', full_name: 'Farmer Demo' })
  });
  let data = await res.json();
  assert(res.status === 400 && data.error && data.error.includes('already exists'), 'Test 7: Duplicate verified email rejected');

  // Test 1: Signup new user
  const testEmail = 'verify_flow_' + Date.now() + '@example.com';
  res = await fetch(base + '/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: 'StrongPassword123',
      role: 'farmer',
      full_name: 'Suresh Kumar',
      phone: '9876543210',
      profile_data: { village: 'Mandya Rural', district: 'Mandya', state: 'Karnataka' }
    })
  });
  data = await res.json();
  assert(res.status === 200 && data.success === true, 'Test 1: New user registration created pending OTP');

  // Test 6: Unverified user login attempt
  res = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'StrongPassword123' })
  });
  data = await res.json();
  assert(res.status === 403 && data.unverified === true, 'Test 6: Unverified user login blocked with 403 and unverified=true');

  // Test 2: Wrong OTP
  res = await fetch(base + '/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, otp: '999999' })
  });
  data = await res.json();
  assert(res.status === 400 && data.error.includes('Invalid verification code'), 'Test 2: Wrong OTP rejected with error message');

  // Test 4: Retrieve OTP & Test Correct OTP
  res = await fetch(base + '/api/auth/dev-last-otp?email=' + encodeURIComponent(testEmail));
  data = await res.json();
  const validOtp = data.last_otp;
  assert(validOtp && validOtp.length === 6, 'OTP generated and retrieved securely');

  // Test 3: Correct OTP verification
  res = await fetch(base + '/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, otp: validOtp })
  });
  data = await res.json();
  assert(res.status === 200 && data.success === true, 'Test 3: Correct OTP verified and account activated');

  // Test Resend on verified account
  res = await fetch(base + '/api/auth/resend-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail })
  });
  data = await res.json();
  assert(res.status === 400 && data.error.includes('already verified'), 'Resend on verified account rejected');

  // Test 1 & 9: Login after verification
  res = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'StrongPassword123' })
  });
  data = await res.json();
  assert(res.status === 200 && data.user && data.user.email === testEmail && data.user.email_verified === true, 'Test 1 & 9: Newly verified user successfully logs in');

  // Test 5: Existing verified demo accounts continue to log in
  res = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'farmer@farmgrid.demo', password: 'Farmer@123' })
  });
  data = await res.json();
  assert(res.status === 200 && data.user && data.user.email === 'farmer@farmgrid.demo', 'Test 5: Demo Farmer logs in normally');

  res = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'org@farmgrid.demo', password: 'Org@123' })
  });
  data = await res.json();
  assert(res.status === 200 && data.user && data.user.email === 'org@farmgrid.demo', 'Test 5: Demo Organization logs in normally');

  console.log('\n--- RESULTS: ' + passed + ' PASSED, ' + failed + ' FAILED ---');
}

runTests();
