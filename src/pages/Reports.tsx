import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Trash2, Calendar, Edit, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface TransactionItem {
  id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface Transaction {
  id: string;
  transaction_date: string;
  total_amount: number;
  payment_amount: number;
  change_amount: number;
  transaction_items?: TransactionItem[];
}

const Reports = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [startDate, setStartDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editItems, setEditItems] = useState<TransactionItem[]>([]);

  useEffect(() => {
    fetchTransactions();
  }, [startDate, endDate]);

  const fetchTransactions = async () => {
    const { data: transactionsData, error: transactionsError } = await supabase
      .from("transactions")
      .select("*")
      .gte("transaction_date", `${startDate}T00:00:00`)
      .lte("transaction_date", `${endDate}T23:59:59`)
      .order("transaction_date", { ascending: false });

    if (transactionsError) {
      toast.error("Failed to load reports");
      console.error(transactionsError);
      return;
    }

    // Fetch items for each transaction
    const transactionsWithItems = await Promise.all(
      (transactionsData || []).map(async (transaction) => {
        const { data: items } = await supabase
          .from("transaction_items")
          .select("*")
          .eq("transaction_id", transaction.id);
        
        return {
          ...transaction,
          transaction_items: items || [],
        };
      })
    );

    setTransactions(transactionsWithItems);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      // Delete transaction items first
      await supabase.from("transaction_items").delete().eq("transaction_id", id);
      
      // Then delete transaction
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) {
        toast.error("Failed to delete transaction");
        console.error(error);
      } else {
        toast.success("Transaction deleted successfully");
        fetchTransactions();
      }
    }
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditItems(transaction.transaction_items || []);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction) return;

    // Calculate new total
    const newTotal = editItems.reduce((sum, item) => sum + item.subtotal, 0);

    // Update transaction
    const { error: transError } = await supabase
      .from("transactions")
      .update({
        total_amount: newTotal,
        payment_amount: editingTransaction.payment_amount,
        change_amount: editingTransaction.payment_amount - newTotal,
      })
      .eq("id", editingTransaction.id);

    if (transError) {
      toast.error("Failed to update transaction");
      console.error(transError);
      return;
    }

    // Update transaction items
    for (const item of editItems) {
      const { error: itemError } = await supabase
        .from("transaction_items")
        .update({
          quantity: item.quantity,
          price: item.price,
          subtotal: item.quantity * item.price,
        })
        .eq("id", item.id);

      if (itemError) {
        toast.error("Failed to update items");
        console.error(itemError);
        return;
      }
    }

    toast.success("Transaction updated successfully");
    setEditDialogOpen(false);
    fetchTransactions();
  };

  const updateItemQuantity = (itemId: string, quantity: number) => {
    setEditItems(
      editItems.map((item) =>
        item.id === itemId
          ? { ...item, quantity, subtotal: quantity * item.price }
          : item
      )
    );
  };

  const updateItemPrice = (itemId: string, price: number) => {
    setEditItems(
      editItems.map((item) =>
        item.id === itemId
          ? { ...item, price, subtotal: item.quantity * price }
          : item
      )
    );
  };

  const totalRevenue = transactions.reduce(
    (sum, t) => sum + t.total_amount,
    0
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Date Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium">From Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium">To Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent">
              Rp {totalRevenue.toLocaleString("id-ID")}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Payment</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <>
                  <TableRow key={transaction.id}>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleRow(transaction.id)}
                      >
                        {expandedRows.has(transaction.id) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {format(
                        new Date(transaction.transaction_date),
                        "dd MMM yyyy HH:mm",
                        { locale: id }
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      Rp {transaction.total_amount.toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="text-right">
                      Rp {transaction.payment_amount.toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell className="text-right">
                      Rp {transaction.change_amount.toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(transaction)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(transaction.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedRows.has(transaction.id) && (
                    <TableRow>
                      <TableCell colSpan={6} className="bg-muted/50">
                        <div className="p-4">
                          <h4 className="font-semibold mb-2">Items Purchased:</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product Code</TableHead>
                                <TableHead>Product Name</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead className="text-right">Price</TableHead>
                                <TableHead className="text-right">Subtotal</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {transaction.transaction_items?.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell>{item.product_code}</TableCell>
                                  <TableCell>{item.product_name}</TableCell>
                                  <TableCell className="text-right">{item.quantity}</TableCell>
                                  <TableCell className="text-right">
                                    Rp {item.price.toLocaleString("id-ID")}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    Rp {item.subtotal.toLocaleString("id-ID")}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No transactions
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date & Time</Label>
              <Input
                type="text"
                value={
                  editingTransaction
                    ? format(
                        new Date(editingTransaction.transaction_date),
                        "dd MMM yyyy HH:mm",
                        { locale: id }
                      )
                    : ""
                }
                disabled
              />
            </div>
            <div>
              <Label>Payment Amount</Label>
              <Input
                type="number"
                value={editingTransaction?.payment_amount || 0}
                onChange={(e) =>
                  setEditingTransaction(
                    editingTransaction
                      ? {
                          ...editingTransaction,
                          payment_amount: parseFloat(e.target.value) || 0,
                        }
                      : null
                  )
                }
              />
            </div>
            <div>
              <h4 className="font-semibold mb-2">Items:</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.product_name}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItemQuantity(
                              item.id,
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="w-20"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.price}
                          onChange={(e) =>
                            updateItemPrice(
                              item.id,
                              parseFloat(e.target.value) || 0
                            )
                          }
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        Rp {item.subtotal.toLocaleString("id-ID")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">
                New Total: Rp{" "}
                {editItems
                  .reduce((sum, item) => sum + item.subtotal, 0)
                  .toLocaleString("id-ID")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;
