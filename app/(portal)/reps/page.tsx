import { redirect } from 'next/navigation'

// The Sales Reps page now lives at /consultants. Redirect any old links.
export default function RepsPage() {
  redirect('/consultants')
}
