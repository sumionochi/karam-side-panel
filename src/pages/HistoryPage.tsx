import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TransactionItem } from '@/components/TransactionItem';
import { mockTransactions, mockCurrentUser } from '@/lib/mockData';
import { Filter, Download, Calendar } from 'lucide-react';

export const HistoryPage = () => {
  const [filter, setFilter] = useState<'all' | 'give' | 'slash' | 'received'>('all');
  
  // TODO: Replace with actual transaction history from smart contract
  const transactions = mockTransactions;
  const currentUserId = mockCurrentUser.id;

  const filteredTransactions = transactions.filter(tx => {
    switch (filter) {
      case 'give':
        return tx.from === currentUserId && tx.type === 'give';
      case 'slash':
        return tx.from === currentUserId && tx.type === 'slash';
      case 'received':
        return tx.to === currentUserId;
      default:
        return tx.from === currentUserId || tx.to === currentUserId;
    }
  });

  const filters = [
    { key: 'all', label: 'All', count: transactions.length },
    { key: 'give', label: 'Given', count: transactions.filter(tx => tx.from === currentUserId && tx.type === 'give').length },
    { key: 'slash', label: 'Slashed', count: transactions.filter(tx => tx.from === currentUserId && tx.type === 'slash').length },
    { key: 'received', label: 'Received', count: transactions.filter(tx => tx.to === currentUserId).length },
  ];

  const exportTransactions = () => {
    // TODO: Implement transaction export functionality
    console.log('📊 TODO: Export transaction history as CSV/JSON');
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Transaction History
            </div>
            <Button variant="outline" size="sm" onClick={exportTransactions}>
              <Download className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Filter Tabs */}
      <Card>
        <CardContent className="p-3">
          <div className="flex gap-2 overflow-x-auto">
            {filters.map((filterOption) => (
              <Button
                key={filterOption.key}
                variant={filter === filterOption.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(filterOption.key as any)}
                className="whitespace-nowrap"
              >
                {filterOption.label}
                <Badge variant="secondary" className="ml-2 text-xs">
                  {filterOption.count}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <div className="space-y-3">
        {filteredTransactions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Filter className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No transactions found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try changing the filter or start giving karma!
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredTransactions.map((transaction) => (
            <TransactionItem 
              key={transaction.id} 
              transaction={transaction} 
              currentUserId={currentUserId}
            />
          ))
        )}
      </div>

      {/* Summary Stats */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-karma-positive">
                +{mockCurrentUser.totalReceived}
              </div>
              <div className="text-xs text-muted-foreground">Total Received</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-primary">
                -{mockCurrentUser.totalGiven}
              </div>
              <div className="text-xs text-muted-foreground">Total Given</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};