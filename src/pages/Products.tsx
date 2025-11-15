import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  code: string;
  name: string;
  price: number;
}

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({ code: "", name: "", price: "" });

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

  const generateNextCode = async () => {
    const { data } = await supabase
      .from("products")
      .select("code")
      .order("code", { ascending: false })
      .limit(1);

    if (data && data.length > 0) {
      const lastCode = data[0].code;
      const num = parseInt(lastCode.substring(1)) + 1;
      return `P${num.toString().padStart(3, "0")}`;
    }
    return "P001";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let code = formData.code.trim();
    if (!code) {
      code = await generateNextCode();
    }

    const productData = {
      code,
      name: formData.name.trim(),
      price: parseFloat(formData.price),
    };

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id);

      if (error) {
        toast.error("Gagal mengupdate produk");
        console.error(error);
      } else {
        toast.success("Produk berhasil diupdate");
        fetchProducts();
        handleClose();
      }
    } else {
      const { error } = await supabase.from("products").insert(productData);

      if (error) {
        toast.error("Gagal menambah produk");
        console.error(error);
      } else {
        toast.success("Produk berhasil ditambahkan");
        fetchProducts();
        handleClose();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus produk ini?")) {
      const { error } = await supabase.from("products").delete().eq("id", id);

      if (error) {
        toast.error("Gagal menghapus produk");
        console.error(error);
      } else {
        toast.success("Produk berhasil dihapus");
        fetchProducts();
      }
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      code: product.code,
      name: product.name,
      price: product.price.toString(),
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingProduct(null);
    setFormData({ code: "", name: "", price: "" });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Manajemen Produk</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingProduct(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Produk
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Edit Produk" : "Tambah Produk"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="code">
                  Kode Produk (kosongkan untuk auto-generate)
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="P001"
                />
              </div>
              <div>
                <Label htmlFor="name">Nama Produk *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="price">Harga *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Batal
                </Button>
                <Button type="submit">Simpan</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode</TableHead>
              <TableHead>Nama Produk</TableHead>
              <TableHead className="text-right">Harga</TableHead>
              <TableHead className="w-[100px]">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell className="font-medium">{product.code}</TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell className="text-right">
                  Rp {product.price.toLocaleString("id-ID")}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(product)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(product.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default Products;
