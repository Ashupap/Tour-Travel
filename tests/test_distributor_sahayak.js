const BASE_URL = 'http://127.0.0.1:8090';

async function run() {
  console.log('Testing Admin Distributor & Sahayak Endpoints...');
  
  // 1. Authenticate - try portaladmin or superuser
  let token = null;
  const adminLoginRes = await fetch(`${BASE_URL}/api/collections/users/auth-with-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identity: 'portaladmin@bharatyatra.local', password: 'password123456' })
  });

  if (adminLoginRes.ok) {
    const adminData = await adminLoginRes.json();
    token = adminData.token;
    console.log('✓ Admin authenticated via portaladmin@bharatyatra.local');
  } else {
    // Try superuser
    const suRes = await fetch(`${BASE_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: 'admin@bharatyatra.local', password: 'password123456' })
    });
    if (!suRes.ok) {
      throw new Error('Both portal admin and superuser authentication failed: ' + (await suRes.text()));
    }
    const suData = await suRes.json();
    token = suData.token;
    console.log('✓ Admin authenticated via superuser token');
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': token
  };

  // 2. Register Distributor
  const rand = Math.floor(1000 + Math.random() * 9000);
  const distEmail = `dist_${rand}_${Date.now()}@bharatyatra.local`;
  const regDistRes = await fetch(`${BASE_URL}/api/admin/distributors`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: `Ramesh Hub Balasore ${rand}`,
      email: distEmail,
      phone: `987650${rand}`,
      password: 'DistPassword123!',
      commission_rate: 3.5
    })
  });
  const regDistData = await regDistRes.json();
  if (regDistRes.status !== 201) {
    throw new Error(`Register distributor failed (${regDistRes.status}): ` + JSON.stringify(regDistData));
  }
  const distId = regDistData.id;
  console.log(`✓ Distributor registered: ${regDistData.name} (${distId})`);

  // 3. List Distributors
  const listDistRes = await fetch(`${BASE_URL}/api/admin/distributors?search=Balasore`, { headers });
  const listDistData = await listDistRes.json();
  if (!listDistRes.ok || !listDistData.distributors.find(d => d.id === distId)) {
    throw new Error('Distributor not found in list: ' + JSON.stringify(listDistData));
  }
  console.log(`✓ Distributor found in list, total distributors: ${listDistData.count}`);

  // 4. Reset Distributor Password
  const resetDistRes = await fetch(`${BASE_URL}/api/admin/distributors/${distId}/reset-password`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ password: 'NewDistPassword456!' })
  });
  if (!resetDistRes.ok) {
    throw new Error('Reset distributor password failed: ' + (await resetDistRes.text()));
  }
  console.log('✓ Distributor password successfully reset');

  // 5. Update / Disable Distributor
  const updateDistRes = await fetch(`${BASE_URL}/api/admin/distributors/${distId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ is_active: false, commission_percentage: 4.0 })
  });
  const updateDistData = await updateDistRes.json();
  if (!updateDistRes.ok || updateDistData.is_active !== false) {
    throw new Error('Update distributor failed: ' + JSON.stringify(updateDistData));
  }
  console.log('✓ Distributor disabled & commission updated');

  // Reactivate distributor for sahayak mapping
  await fetch(`${BASE_URL}/api/admin/distributors/${distId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ is_active: true })
  });

  // 6. Distributor Analytics
  const distAnalyticsRes = await fetch(`${BASE_URL}/api/admin/distributors/${distId}/analytics`, { headers });
  const distAnalyticsData = await distAnalyticsRes.json();
  if (!distAnalyticsRes.ok || !distAnalyticsData.distributor) {
    throw new Error('Distributor analytics failed: ' + JSON.stringify(distAnalyticsData));
  }
  console.log(`✓ Distributor analytics fetched: ${distAnalyticsData.distributor.name}, attached sahayaks: ${distAnalyticsData.sahayaks.length}`);

  // 7. Register Sahayak under Distributor
  const sahayakEmail = `sahayak_${rand}_${Date.now()}@bharatyatra.local`;
  const regSahayakRes = await fetch(`${BASE_URL}/api/admin/sahayaks`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: `Sunil Nayak Sahayak ${rand}`,
      email: sahayakEmail,
      phone: `912340${rand}`,
      password: 'SahayakPassword123!',
      distributor_id: distId,
      commission_rate: 2.0
    })
  });
  const regSahayakData = await regSahayakRes.json();
  if (regSahayakRes.status !== 201) {
    throw new Error(`Register sahayak failed (${regSahayakRes.status}): ` + JSON.stringify(regSahayakData));
  }
  const sahayakId = regSahayakData.id;
  console.log(`✓ Sahayak registered: ${regSahayakData.name} (${sahayakId}) under Distributor`);

  // 8. List Sahayaks
  const listSahayakRes = await fetch(`${BASE_URL}/api/admin/sahayaks?search=Sunil`, { headers });
  const listSahayakData = await listSahayakRes.json();
  if (!listSahayakRes.ok || !listSahayakData.sahayaks.find(s => s.id === sahayakId)) {
    throw new Error('Sahayak not found in list: ' + JSON.stringify(listSahayakData));
  }
  console.log(`✓ Sahayak found in list, total sahayaks: ${listSahayakData.count}`);

  // 9. Reset Sahayak Password
  const resetSahayakRes = await fetch(`${BASE_URL}/api/admin/sahayaks/${sahayakId}/reset-password`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ password: 'NewSahayakPassword456!' })
  });
  if (!resetSahayakRes.ok) {
    throw new Error('Reset sahayak password failed: ' + (await resetSahayakRes.text()));
  }
  console.log('✓ Sahayak password successfully reset');

  // 10. Update / Disable Sahayak
  const updateSahayakRes = await fetch(`${BASE_URL}/api/admin/sahayaks/${sahayakId}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ is_active: false })
  });
  const updateSahayakData = await updateSahayakRes.json();
  if (!updateSahayakRes.ok || updateSahayakData.is_active !== false) {
    throw new Error('Update sahayak failed: ' + JSON.stringify(updateSahayakData));
  }
  console.log('✓ Sahayak disabled');

  // 11. Sahayak Analytics
  const sahayakAnalyticsRes = await fetch(`${BASE_URL}/api/admin/sahayaks/${sahayakId}/analytics`, { headers });
  const sahayakAnalyticsData = await sahayakAnalyticsRes.json();
  if (!sahayakAnalyticsRes.ok || !sahayakAnalyticsData.sahayak) {
    throw new Error('Sahayak analytics failed: ' + JSON.stringify(sahayakAnalyticsData));
  }
  console.log(`✓ Sahayak analytics fetched: ${sahayakAnalyticsData.sahayak.name}, enrolled devotees: ${sahayakAnalyticsData.devotees.length}`);

  // 12. Delete Sahayak & Distributor
  const delSahayakRes = await fetch(`${BASE_URL}/api/admin/sahayaks/${sahayakId}`, {
    method: 'DELETE',
    headers
  });
  if (!delSahayakRes.ok) {
    throw new Error('Delete sahayak failed: ' + (await delSahayakRes.text()));
  }
  console.log('✓ Sahayak successfully deleted/deactivated');

  const delDistRes = await fetch(`${BASE_URL}/api/admin/distributors/${distId}`, {
    method: 'DELETE',
    headers
  });
  if (!delDistRes.ok) {
    throw new Error('Delete distributor failed: ' + (await delDistRes.text()));
  }
  console.log('✓ Distributor successfully deleted/deactivated');

  console.log('\n=============================================');
  console.log('✓ ALL DISTRIBUTOR & SAHAYAK TESTS PASSED (100%)');
  console.log('=============================================\n');
}

run().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
