import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Clock, Trash2 } from "lucide-react";

interface PrintingOrder {
  id: string;
  customer_name: string;
  phone_number: string;
  order_name: string;
  is_paid: boolean;
  is_completed: boolean;
  created_at: string;
}

const PrintingOrders = () => {
  const [orders, setOrders] = useState<PrintingOrder[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [orderName, setOrderName] = useState("");
  const [isPaid, setIsPaid] = useState("false");
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("printing_orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Gagal memuat data orderan",
        variant: "destructive",
      });
      return;
    }

    setOrders(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const trimmedName = customerName.trim();
    const trimmedPhone = phoneNumber.trim();
    const trimmedOrder = orderName.trim();

    if (!trimmedName) {
      toast({
        title: "Error",
        description: "Nama pelanggan tidak boleh kosong",
        variant: "destructive",
      });
      return;
    }

    if (!trimmedPhone) {
      toast({
        title: "Error",
        description: "Nomor HP tidak boleh kosong",
        variant: "destructive",
      });
      return;
    }

    if (!trimmedOrder) {
      toast({
        title: "Error",
        description: "Nama orderan tidak boleh kosong",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("printing_orders").insert({
      customer_name: trimmedName,
      phone_number: trimmedPhone,
      order_name: trimmedOrder,
      is_paid: isPaid === "true",
      is_completed: false,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Gagal menambahkan orderan",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Berhasil",
      description: "Orderan berhasil ditambahkan",
    });

    // Reset form
    setCustomerName("");
    setPhoneNumber("");
    setOrderName("");
    setIsPaid("false");
    fetchOrders();
  };

  const handleToggleComplete = async (orderId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from("printing_orders")
      .update({ is_completed: !currentStatus })
      .eq("id", orderId);

    if (error) {
      toast({
        title: "Error",
        description: "Gagal mengubah status orderan",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Berhasil",
      description: currentStatus ? "Orderan dipindahkan ke proses" : "Orderan selesai",
    });
    fetchOrders();
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus orderan ini?")) return;

    const { error } = await supabase
      .from("printing_orders")
      .delete()
      .eq("id", orderId);

    if (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus orderan",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Berhasil",
      description: "Orderan berhasil dihapus",
    });
    fetchOrders();
  };

  const ongoingOrders = orders.filter((order) => !order.is_completed);
  const completedOrders = orders.filter((order) => order.is_completed);

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Orderan Percetakan</h1>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Tambah Orderan Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="customerName">Nama Pelanggan</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Masukkan nama pelanggan"
                />
              </div>

              <div>
                <Label htmlFor="phoneNumber">Nomor HP</Label>
                <Input
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Masukkan nomor HP"
                />
              </div>

              <div>
                <Label htmlFor="orderName">Nama Orderan Cetak</Label>
                <Input
                  id="orderName"
                  value={orderName}
                  onChange={(e) => setOrderName(e.target.value)}
                  placeholder="Contoh: Banner 2x3 meter"
                />
              </div>

              <div>
                <Label>Status Pembayaran</Label>
                <RadioGroup value={isPaid} onValueChange={setIsPaid}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="paid" />
                    <Label htmlFor="paid">Sudah Dibayar</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="unpaid" />
                    <Label htmlFor="unpaid">Belum Dibayar</Label>
                  </div>
                </RadioGroup>
              </div>

              <Button type="submit" className="w-full">
                Tambah Orderan
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ringkasan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <span className="font-medium">Sedang Proses</span>
              </div>
              <span className="text-2xl font-bold">{ongoingOrders.length}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="font-medium">Selesai</span>
              </div>
              <span className="text-2xl font-bold">{completedOrders.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ongoing" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ongoing">
            Sedang Proses ({ongoingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Selesai ({completedOrders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ongoing" className="space-y-4">
          {ongoingOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Tidak ada orderan yang sedang diproses
              </CardContent>
            </Card>
          ) : (
            ongoingOrders.map((order) => (
              <Card key={order.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <h3 className="font-semibold text-lg">{order.order_name}</h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Pelanggan: {order.customer_name}</p>
                        <p>No HP: {order.phone_number}</p>
                        <p>
                          Status Bayar:{" "}
                          <span className={order.is_paid ? "text-green-600" : "text-red-600"}>
                            {order.is_paid ? "Sudah Dibayar" : "Belum Dibayar"}
                          </span>
                        </p>
                        <p className="text-xs">
                          {new Date(order.created_at).toLocaleDateString("id-ID", {
                            dateStyle: "full",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleToggleComplete(order.id, order.is_completed)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Selesai
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(order.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedOrders.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                Tidak ada orderan yang selesai
              </CardContent>
            </Card>
          ) : (
            completedOrders.map((order) => (
              <Card key={order.id} className="opacity-75">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <h3 className="font-semibold text-lg">{order.order_name}</h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Pelanggan: {order.customer_name}</p>
                        <p>No HP: {order.phone_number}</p>
                        <p>
                          Status Bayar:{" "}
                          <span className={order.is_paid ? "text-green-600" : "text-red-600"}>
                            {order.is_paid ? "Sudah Dibayar" : "Belum Dibayar"}
                          </span>
                        </p>
                        <p className="text-xs">
                          {new Date(order.created_at).toLocaleDateString("id-ID", {
                            dateStyle: "full",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleComplete(order.id, order.is_completed)}
                      >
                        <Clock className="h-4 w-4 mr-1" />
                        Proses Lagi
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(order.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PrintingOrders;
