-- Verify the profile was updated correctly
SELECT 
  id,
  email,
  full_name,
  corporate_account_id,
  corporate_role,
  is_corporate_user,
  created_at
FROM profiles
WHERE email = 'tjockis88@hotmail.com';

-- Also check if the corporate_account exists
SELECT 
  ca.id,
  ca.company_name,
  ca.status,
  ca.admin_user_id
FROM corporate_accounts ca
WHERE ca.id IN (
  SELECT corporate_account_id 
  FROM profiles 
  WHERE email = 'tjockis88@hotmail.com'
);

-- Check the invitation
SELECT 
  email,
  corporate_account_id,
  status,
  sent_at,
  accepted_at
FROM employee_invitations
WHERE email = 'tjockis88@hotmail.com';

