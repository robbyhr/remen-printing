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
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) {
      toast.error("Harga harus lebih dari 0");
      return;
    }
    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, displayPrice: price } : item
      )
    );
  };

  const updateName = (productId: string, newName: string) => {
    const trimmedName = newName.trim();
    if (trimmedName.length === 0) {
      toast.error("Nama produk tidak boleh kosong");
      return;
    }
    setCart(
      cart.map((item) =>
        item.product.id === productId ? { ...item, displayName: trimmedName } : item
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
        
    <div style="font-style: italic;">KETENTUAN</div>
    <div style="font-size: 6px;">
      <div>• Garansi ATK 1x24 Jam</div>
      <div>• Garansi Cetak 3x24 Jam</div>
      <div>• Barang dapat ditukar selama garansi</div>
      <div>• Barang tidak dapat dikembalikan</div>
      <div>• Bawa Struk ini saat Penukaran</div>
    </div>
    <div class="line"></div>
        <div style="height: 50px;"></div>
        <div class="center">TANDA OWNER</div>
    <div class="line"></div>
        <div style="height: 10px;"></div>
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
    <div className="h-[calc(100vh-5rem)] flex flex-col lg:flex-row gap-4">
      {/* Left Side - Product Search & Cart */}
      <div className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Product Search Bar - Prominent */}
        <Card className="flex-shrink-0">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
              <Input
                placeholder="Scan barcode atau ketik nama produk..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-14 h-14 text-lg border-2 focus-visible:ring-4"
                autoFocus
              />
            </div>
            {searchTerm && filteredProducts.length > 0 && (
              <div className="mt-3 max-h-[250px] overflow-y-auto border-2 rounded-lg shadow-lg bg-background">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="w-full text-left p-4 hover:bg-primary/10 transition-all border-b last:border-0 group"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-lg group-hover:text-primary transition-colors">
                          {product.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Kode: {product.code}
                        </div>
                      </div>
                      <div className="text-xl font-bold text-primary">
                        Rp {product.price.toLocaleString("id-ID")}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shopping Cart - Receipt Style */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <CardHeader className="flex-shrink-0 border-b bg-muted/30">
            <CardTitle className="text-xl">Transaksi Saat Ini</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
                <Search className="h-16 w-16 mb-4 opacity-20" />
                <p className="text-lg">Scan produk untuk memulai transaksi</p>
              </div>
            ) : (
              <div className="divide-y">
                {cart.map((item) => (
                  <div key={item.product.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <Input
                          value={item.displayName}
                          onChange={(e) =>
                            updateName(item.product.id, e.target.value)
                          }
                          className="h-9 font-medium mb-2 border-muted"
                        />
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-muted-foreground">Harga:</span>
                            <Input
                              type="number"
                              value={item.displayPrice}
                              onChange={(e) =>
                                updatePrice(item.product.id, e.target.value)
                              }
                              className="h-8 w-28 text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-background"
                              onClick={() => updateQuantity(item.product.id, -1)}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="w-10 text-center font-bold text-lg">
                              {item.quantity}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-background"
                              onClick={() => updateQuantity(item.product.id, 1)}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <div className="text-xl font-bold text-primary">
                          Rp {(item.displayPrice * item.quantity).toLocaleString("id-ID")}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.product.id)}
                          className="hover:bg-destructive/10"
                        >
                          <Trash2 className="h-5 w-5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Side - Payment Panel */}
      <div className="lg:w-[380px] flex flex-col gap-4">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="border-b bg-muted/30">
            <CardTitle className="text-xl">Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between pt-6">
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 border-2 border-primary/20">
                <div className="text-sm text-muted-foreground mb-2">Total Belanja</div>
                <div className="text-5xl font-bold text-primary tracking-tight">
                  Rp {totalAmount.toLocaleString("id-ID")}
                </div>
                <div className="text-sm text-muted-foreground mt-3">
                  {cart.length} item{cart.length !== 1 && 's'}
                </div>
              </div>

              {cart.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-medium">Rp {totalAmount.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pajak:</span>
                    <span className="font-medium">Rp 0</span>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 mt-6">
              <Button
                className="w-full h-16 text-xl font-semibold"
                size="lg"
                disabled={cart.length === 0}
                onClick={() => setShowPayment(true)}
              >
                <Printer className="mr-3 h-6 w-6" />
                Proses Pembayaran
              </Button>
              {cart.length > 0 && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setCart([])}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Batal Transaksi
                </Button>
              )}
            </div>
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
