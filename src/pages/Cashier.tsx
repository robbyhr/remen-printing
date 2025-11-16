import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Minus, Trash2, Printer } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
}

interface CartItem {
  product: Product;
  quantity: number;
  displayPrice: number;
  displayName: string;
}

const Cashier = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [showPayment, setShowPayment] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("code", { ascending: true });

    if (error) {
      toast.error("Gagal memuat produk");
      console.error(error);
    } else {
      setProducts(data || []);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: Product) => {
    const existing = cart.find((item) => item.product.id === product.id);
    if (existing) {
      setCart(
        cart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([
        ...cart,
        {
          product,
          quantity: 1,
          displayPrice: product.price,
          displayName: product.name,
        },
      ]);
    }
    setSearchTerm("");
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(
      cart
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const updatePrice = (productId: string, newPrice: string) => {
    const price = parseFloat(newPrice) || 0;
    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, displayPrice: price } : item
      )
    );
  };

  const updateName = (productId: string, newName: string) => {
    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, displayName: newName } : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product.id !== productId));
  };

  const totalAmount = cart.reduce(
    (sum, item) => sum + item.displayPrice * item.quantity,
    0
  );

  const handlePayment = async () => {
    const payment = parseFloat(paymentAmount);
    if (!payment || payment < totalAmount) {
      toast.error("Jumlah pembayaran tidak valid");
      return;
    }

    const changeAmount = payment - totalAmount;

    // Save transaction
    const { data: transactionData, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        total_amount: totalAmount,
        payment_amount: payment,
        change_amount: changeAmount,
      })
      .select()
      .single();

    if (transactionError) {
      toast.error("Gagal menyimpan transaksi");
      console.error(transactionError);
      return;
    }

    // Save transaction items
    const items = cart.map((item) => ({
      transaction_id: transactionData.id,
      product_code: item.product.code,
      product_name: item.displayName,
      quantity: item.quantity,
      price: item.displayPrice,
      subtotal: item.displayPrice * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from("transaction_items")
      .insert(items);

    if (itemsError) {
      toast.error("Gagal menyimpan detail transaksi");
      console.error(itemsError);
      return;
    }

    // Print receipt
    printReceipt(transactionData.id, payment, changeAmount);

    // Reset
    setCart([]);
    setPaymentAmount("");
    setShowPayment(false);
    toast.success("Transaksi berhasil");
  };

  const printReceipt = (
    transactionId: string,
    payment: number,
    change: number
  ) => {
    const receiptWindow = window.open("", "_blank", "width=302,height=600");
    if (!receiptWindow) return;

    const receiptHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Struk</title>
        <style>
          @page { size: 58mm auto; margin: 0; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 9px;
            width: 48mm; /* safe printable width for POS-58 */
            margin: 0;    /* align hard-left */
            padding: 0.5mm 0 0.5mm 0; /* minimal padding */
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 2px 0; }
          .item { margin: 1px 0; }
          .item-name { 
            margin-bottom: 1px;
            word-break: break-word;
          }
          .row { 
            display: flex; 
            align-items: baseline;
            justify-content: space-between;
            gap: 2px;
          }
          .label { flex: 1 1 auto; min-width: 0; }
          .amount { 
            flex: 0 0 auto; 
            text-align: right; 
            white-space: nowrap; 
          }
          .summary { margin: 1px 0; }
        </style>
      </head>
      <body>
        <div class="center bold">REMEN PRINTING</div>
        <div class="center">Telp 082158103363</div>
        <div class="center">Jl. Poros Kota Bangun III</div>
        <div class="line"></div>
        <div>ID: ${transactionId.substring(0, 8)}</div>
        <div>${new Date().toLocaleString("id-ID", { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</div>
        <div class="line"></div>
        ${cart
          .map(
            (item) => `
        <div class="item">
          <div class="item-name">${item.displayName}</div>
          <div class="row">
            <span class="label">${item.quantity}x ${item.displayPrice.toLocaleString("id-ID")}</span>
            <span class="amount">${(item.displayPrice * item.quantity).toLocaleString("id-ID")}</span>
          </div>
        </div>
        `
          )
          .join("")}
        <div class="line"></div>
        <div class="row bold summary">
          <span class="label">TOTAL:</span>
          <span class="amount">${totalAmount.toLocaleString("id-ID")}</span>
        </div>
        <div class="row summary">
          <span class="label">Bayar:</span>
          <span class="amount">${payment.toLocaleString("id-ID")}</span>
        </div>
        <div class="row summary">
          <span class="label">Kembalian:</span>
          <span class="amount">${change.toLocaleString("id-ID")}</span>
        </div>
        <div class="line"></div>
        <div class="center">Terima Kasih</div>
        <div class="center">Selamat Datang Kembali</div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 100);
          };
        </script>
      </body>
      </html>
    `;

    receiptWindow.document.write(receiptHtml);
    receiptWindow.document.close();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Cari Produk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari kode atau nama produk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {searchTerm && filteredProducts.length > 0 && (
              <div className="mt-2 max-h-[200px] overflow-y-auto border rounded-lg">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="w-full text-left p-3 hover:bg-secondary transition-colors border-b last:border-0"
                  >
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {product.code} - Rp {product.price.toLocaleString("id-ID")}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Keranjang Belanja</CardTitle>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Keranjang kosong
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produk</TableHead>
                    <TableHead>Harga</TableHead>
                    <TableHead className="text-center">Qty</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cart.map((item) => (
                    <TableRow key={item.product.id}>
                      <TableCell>
                        <Input
                          value={item.displayName}
                          onChange={(e) =>
                            updateName(item.product.id, e.target.value)
                          }
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.displayPrice}
                          onChange={(e) =>
                            updatePrice(item.product.id, e.target.value)
                          }
                          className="h-8 w-24 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.product.id, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-8 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.product.id, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        Rp{" "}
                        {(item.displayPrice * item.quantity).toLocaleString(
                          "id-ID"
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="sticky top-20">
          <CardHeader>
            <CardTitle>Total Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-3xl font-bold text-center text-primary">
              Rp {totalAmount.toLocaleString("id-ID")}
            </div>
            <Button
              className="w-full"
              size="lg"
              disabled={cart.length === 0}
              onClick={() => setShowPayment(true)}
            >
              <Printer className="mr-2 h-5 w-5" />
              Bayar & Cetak Struk
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pembayaran</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Total Belanja</Label>
              <div className="text-2xl font-bold text-primary">
                Rp {totalAmount.toLocaleString("id-ID")}
              </div>
            </div>
            <div>
              <Label htmlFor="payment">Jumlah Bayar</Label>
              <Input
                id="payment"
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>
            {paymentAmount && parseFloat(paymentAmount) >= totalAmount && (
              <div className="p-4 bg-accent/10 rounded-lg">
                <div className="text-sm text-muted-foreground">Kembalian</div>
                <div className="text-xl font-bold text-accent">
                  Rp{" "}
                  {(parseFloat(paymentAmount) - totalAmount).toLocaleString(
                    "id-ID"
                  )}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowPayment(false)}
              >
                Batal
              </Button>
              <Button
                className="flex-1"
                onClick={handlePayment}
                disabled={
                  !paymentAmount || parseFloat(paymentAmount) < totalAmount
                }
              >
                Proses
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Cashier;
