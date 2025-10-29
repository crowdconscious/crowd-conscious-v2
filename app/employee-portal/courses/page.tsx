import { redirect } from 'next/navigation'

export default function EmployeeCoursesPage() {
  // Redirect to dashboard where the modules are displayed
  redirect('/employee-portal/dashboard')
}

