import { useCredits } from '@/hooks/useCredits';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ArrowDownCircle, ArrowUpCircle, History } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export function CreditHistory() {
  const { transactions, isLoading } = useCredits();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Credit History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted/50 animate-pulse rounded-md" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Credit History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No transactions yet. Start using Wiser AI to see your credit history.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Credit History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-3">
            {transactions.map(transaction => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {transaction.transaction_type === 'credit' ? (
                    <ArrowUpCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <ArrowDownCircle className="h-5 w-5 text-orange-500" />
                  )}
                  <div>
                    <p className="font-medium text-sm capitalize">
                      {transaction.operation.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge 
                    variant={transaction.transaction_type === 'credit' ? 'default' : 'secondary'}
                    className={transaction.transaction_type === 'credit' ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20' : ''}
                  >
                    {transaction.transaction_type === 'credit' ? '+' : '-'}{transaction.amount}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    Balance: {transaction.balance_after}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
