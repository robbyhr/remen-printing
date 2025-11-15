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
import { Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Input } from "@/components/ui/input";

interface Transaction {
  id: string;
  transaction_date: string;
  total_amount: number;
  payment_amount: number;
  change_amount: number;
}

const Reports = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [startDate, setStartDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    fetchTransactions();
  }, [startDate, endDate]);

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .gte("transaction_date", `${startDate}T00:00:00`)
      .lte("transaction_date", `${endDate}T23:59:59`)
      .order("transaction_date", { ascending: false });

    if (error) {
      toast.error("Gagal memuat laporan");
      console.error(error);
    } else {
      setTransactions(data || []);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus transaksi ini?")) {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) {
        toast.error("Gagal menghapus transaksi");
        console.error(error);
      } else {
        toast.success("Transaksi berhasil dihapus");
        fetchTransactions();
      }
    }
  };

  const totalRevenue = transactions.reduce(
    (sum, t) => sum + t.total_amount,
    0
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filter Tanggal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium">Dari Tanggal</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium">Sampai Tanggal</label>
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
              Total Transaksi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Total Pendapatan
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
          <CardTitle>Riwayat Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal & Waktu</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Bayar</TableHead>
                <TableHead className="text-right">Kembalian</TableHead>
                <TableHead className="w-[80px]">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(transaction.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Tidak ada transaksi
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

export default Reports;
