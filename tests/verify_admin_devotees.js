import assert from 'assert';

async function testAdminDevoteeBadges() {
  const suRes = await fetch('http://127.0.0.1:8090/api/admins/auth-with-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'admin@bharatyatra.local', password: 'password123456' })
  });
  assert(suRes.ok, 'Admin authentication must succeed');
  const { token } = await suRes.json();
  assert(token, 'Token must be present');

  console.log('✓ Admin authenticated successfully');

  // 1. Devotee Subscriptions API with Badges
  const subRes = await fetch('http://127.0.0.1:8090/api/admin/subscriptions', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  assert(subRes.ok, 'Subscriptions endpoint must return 200');
  const subData = await subRes.json();
  console.log(`✓ Devotee Subscriptions returned ${subData.count} total records`);

  const badges = { eligible: 0, saving: 0, overdue: 0 };
  for (const s of subData.subscriptions) {
    assert(s.id, 'Subscription must have id');
    assert(s.booking_code, 'Subscription must have booking_code');
    assert(s.customer_name, 'Subscription must have customer_name');
    assert(['eligible', 'saving', 'overdue'].includes(s.badge), `Badge must be eligible, saving, or overdue, got ${s.badge}`);
    assert(['green', 'orange', 'red'].includes(s.badge_color), `Badge color must be green, orange, or red, got ${s.badge_color}`);
    badges[s.badge] = (badges[s.badge] || 0) + 1;
  }
  console.log('✓ Badge distribution across devotees:', badges);

  // Check the user requirements:
  // - 2 installments paid -> green ('eligible')
  // - <2 installments paid, no overdue -> orange ('saving')
  // - missed emi -> red ('overdue')
  for (const s of subData.subscriptions) {
    if (s.overdue_emis_count > 0) {
      assert.strictEqual(s.badge, 'overdue', `Devotee with overdue EMI must be red overdue`);
      assert.strictEqual(s.badge_color, 'red', `Color must be red`);
    } else if (s.paid_emis_count >= (s.min_emis_to_travel || 2)) {
      assert.strictEqual(s.badge, 'eligible', `Devotee with 2+ paid EMIs must be green eligible`);
      assert.strictEqual(s.badge_color, 'green', `Color must be green`);
    } else {
      assert.strictEqual(s.badge, 'saving', `Devotee with <2 paid EMIs must be orange saving`);
      assert.strictEqual(s.badge_color, 'orange', `Color must be orange`);
    }
  }
  console.log('✓ Devotee status badge logic 100% conforms to requirements:');
  console.log('    • Green ("Travel Ready"): >= 2 paid installments, 0 overdue');
  console.log('    • Orange ("In Progress"): < 2 paid installments, 0 overdue');
  console.log('    • Red ("Missed EMI"): >= 1 overdue installment');

  // 2. Filter tests
  const filterEligible = await fetch('http://127.0.0.1:8090/api/admin/subscriptions?status=eligible', {
    headers: { 'Authorization': 'Bearer ' + token }
  }).then(r => r.json());
  assert(filterEligible.subscriptions.every(s => s.badge === 'eligible'), 'Filter by eligible must return only eligible');

  const filterOverdue = await fetch('http://127.0.0.1:8090/api/admin/subscriptions?status=overdue', {
    headers: { 'Authorization': 'Bearer ' + token }
  }).then(r => r.json());
  assert(filterOverdue.subscriptions.every(s => s.badge === 'overdue'), 'Filter by overdue must return only overdue');
  console.log(`✓ Status filter pills validated (eligible=${filterEligible.count}, overdue=${filterOverdue.count})`);

  // 3. Devotee Passbook Modal Data
  const targetSub = subData.subscriptions[0];
  const pbRes = await fetch(`http://127.0.0.1:8090/api/admin/subscriptions/${targetSub.id}`, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  assert(pbRes.ok, 'Passbook endpoint must return 200');
  const pbData = await pbRes.json();
  assert(pbData.subscription, 'Passbook must include subscription');
  assert(Array.isArray(pbData.installments), 'Passbook must include installments array');
  console.log(`✓ Devotee Passbook loaded: ${pbData.subscription.customer_name} (${pbData.installments.length} installments scheduled)`);

  // 4. Field Network & Float
  const netRes = await fetch('http://127.0.0.1:8090/api/admin/field-network', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  assert(netRes.ok, 'Field network endpoint must return 200');
  const netData = await netRes.json();
  assert(Array.isArray(netData.agents), 'Field network must return agents');
  assert(Array.isArray(netData.distributors), 'Field network must return distributors');
  console.log(`✓ Field Network loaded: ${netData.agents.length} Sahayaks, ${netData.distributors.length} Distributors, ${netData.recent_handovers.length} Handovers`);

  console.log('\n=============================================');
  console.log('ALL ADMIN DASHBOARD DEVOTEE VERIFICATIONS PASSED!');
  console.log('=============================================');
}

testAdminDevoteeBadges().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
