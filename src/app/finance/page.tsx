
"use client";

import type { FinancialTransaction } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, TrendingUp, TrendingDown, MoreHorizontal, Edit, Trash2, DollarSign as IconDollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mockTransactions: FinancialTransaction[] = [
  { id: '1', date: '2024-07-15', description: 'Session with Alice (Cheshire)', type: 'Income', amount: 150, status: 'Paid', clientId: '1', clientName: 'Alice Wonderland' },
  { id: '2', date: '2024-07-10', description: 'Session with Bob (Scoop)', type: 'Income', amount: 120, status: 'Paid', clientId: '2', clientName: 'Bob The Builder' },
  { id: '3', date: '2024-07-05', description: 'Training Treats Purchase', type: 'Expense', amount: 45.50, status: 'Paid' },
  { id: '4', date: '2024-07-18', description: 'Session with Charlie (Snoopy)', type: 'Income', amount: 150, status: 'Unpaid', clientId: '3', clientName: 'Charlie Brown' },
  { id: '5', date: '2024-07-01', description: 'Clicker Purchase', type: 'Expense', amount: 15.00, status: 'Paid' },
];

export default function FinancePage() {
  const totalIncome = mockTransactions.filter(t => t.type === 'Income' && t.status === 'Paid').reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = mockTransactions.filter(t => t.type === 'Expense').reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalIncome - totalExpenses;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Financial Records</h1>
        <Button>
          <PlusCircle className="mr-2 h-5 w-5" />
          Add Transaction
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income (Paid)</CardTitle> {/* Removed font-serif */}
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{totalIncome.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle> {/* Removed font-serif */}
            <TrendingDown className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{totalExpenses.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle> {/* Removed font-serif */}
            <IconDollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{netProfit.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle> {/* Removed font-serif */}
          <CardDescription>View and manage all financial transactions.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{transaction.date}</TableCell>
                  <TableCell className="font-medium">{transaction.description}</TableCell>
                  <TableCell>{transaction.clientName || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={transaction.type === 'Income' ? 'default' : 'secondary'}
                           className={transaction.type === 'Income' ? 'bg-green-500/20 text-green-700 border-green-500/30 hover:bg-green-500/30' : 'bg-red-500/20 text-red-700 border-red-500/30 hover:bg-red-500/30'}>
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell className={transaction.type === 'Income' ? 'text-green-600' : 'text-red-600'}>
                    £{transaction.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                     <Badge variant={
                        transaction.status === 'Paid' ? 'default' : 
                        transaction.status === 'Unpaid' ? 'destructive' : 'outline'
                      }
                      className={
                        transaction.status === 'Paid' ? 'bg-green-100 text-green-800 border-green-300' :
                        transaction.status === 'Unpaid' ? 'bg-red-100 text-red-800 border-red-300' :
                        'bg-yellow-100 text-yellow-800 border-yellow-300'
                      }
                     >
                      {transaction.status}
                     </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        {transaction.status === 'Unpaid' && (
                           <DropdownMenuItem>
                             Mark as Paid
                           </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive hover:!bg-destructive/10">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
