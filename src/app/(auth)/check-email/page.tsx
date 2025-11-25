import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft } from 'lucide-react';

export default function CheckEmailPage() {
  return (
    <Card className="border-0 shadow-xl">
      <CardContent className="pt-8 pb-6 text-center space-y-4">
        <div className="mx-auto w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
          <Mail className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Check your email
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            We&apos;ve sent you a confirmation link to verify your email address.
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-400">
          <p>
            Click the link in the email to activate your account. If you don&apos;t see it, check your spam folder.
          </p>
        </div>
      </CardContent>

      <CardFooter className="justify-center border-t py-4">
        <Link href="/login">
          <Button variant="ghost" className="text-gray-600 dark:text-gray-400">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to login
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
