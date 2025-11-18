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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";

interface Withdrawal {
  id: string;
  withdrawal_date: string;
  withdrawal_name: string;
  amount: number;
  created_at: string;
}

const Withdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [withdrawalDate, setWithdrawalDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [withdrawalName, setWithdrawalName] = useState("");
  const [withdrawalAmount, setWithdrawalAmount] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch total revenue from transactions
    const { data: transactions, error: transError } = await supabase
      .from("transactions")
      .select("total_amount");

    if (transError) {
      toast.error("Failed to load revenue data");
      console.error(transError);
    } else {
      const revenue = transactions?.reduce((sum, t) => sum + t.total_amount, 0) || 0;
      setTotalRevenue(revenue);
    }

    // Fetch withdrawals
    const { data: withdrawalsData, error: withdrawError } = await supabase
      .from("withdrawals")
      .select("*")
      .order("withdrawal_date", { ascending: false });

    if (withdrawError) {
      toast.error("Failed to load withdrawals");
      console.error(withdrawError);
    } else {
      setWithdrawals(withdrawalsData || []);
    }
  };

  const handleAddWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(withdrawalAmount);
    
    if (!withdrawalName.trim()) {
      toast.error("Withdrawal name is required");
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid withdrawal amount");
      return;
    }

    const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    const availableBalance = totalRevenue - totalWithdrawals;

    if (amount > availableBalance) {
      toast.error("Withdrawal amount cannot exceed available balance");
      return;
    }

    const { error } = await supabase.from("withdrawals").insert({
      withdrawal_date: `${withdrawalDate}T${format(new Date(), "HH:mm:ss")}`,
      withdrawal_name: withdrawalName,
      amount: amount,
    });

    if (error) {
      toast.error("Failed to add withdrawal");
      console.error(error);
    } else {
      toast.success("Withdrawal added successfully");
      setWithdrawalName("");
      setWithdrawalAmount("");
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this withdrawal?")) {
      const { error } = await supabase
        .from("withdrawals")
        .delete()
        .eq("id", id);

      if (error) {
        toast.error("Failed to delete withdrawal");
        console.error(error);
      } else {
        toast.success("Withdrawal deleted successfully");
        fetchData();
      }
    }
  };

  const totalWithdrawals = withdrawals.reduce((sum, w) => sum + w.amount, 0);
  const availableBalance = totalRevenue - totalWithdrawals;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
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
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Total Withdrawals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              Rp {totalWithdrawals.toLocaleString("id-ID")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              Rp {availableBalance.toLocaleString("id-ID")}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Withdrawal</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddWithdrawal} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={withdrawalDate}
                  onChange={(e) => setWithdrawalDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Withdrawal Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., Owner withdrawal"
                  value={withdrawalName}
                  onChange={(e) => setWithdrawalName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={withdrawalAmount}
                  onChange={(e) => setWithdrawalAmount(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button type="submit">Add Withdrawal</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Withdrawal History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Withdrawal Name</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[80px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawals.map((withdrawal) => (
                <TableRow key={withdrawal.id}>
                  <TableCell>
                    {format(
                      new Date(withdrawal.withdrawal_date),
                      "dd MMM yyyy HH:mm",
                      { locale: id }
                    )}
                  </TableCell>
                  <TableCell>{withdrawal.withdrawal_name}</TableCell>
                  <TableCell className="text-right">
                    Rp {withdrawal.amount.toLocaleString("id-ID")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(withdrawal.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {withdrawals.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No withdrawals yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Withdrawals;
