"use client";
import React, { useState, useTransition } from "react";
import Image from "next/image";
import UploadImage from "@/app/component/UploadImage";
import {
  Benefit,
  Nutrition,
  Product,
  ProductCategory,
  ProductFlavor,
  ProductImages,
  setProducts,
} from "@/utils/DataSlice";
import {
  ImageKitAbortError,
  ImageKitInvalidRequestError,
  ImageKitServerError,
  ImageKitUploadNetworkError,
  upload,
} from "@imagekit/next";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/utils/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"; // Assuming SelectValue is also exported
import { Plus, Trash2, Loader2 } from "lucide-react";
import { FileWithPreview } from "@/FrontendSchema/FileWithPreview.Schema";
import DialogCompo from "../DialogCompo";
import ConfirmDeleteCompo from "../confirmDeleteCompo";
import uploadToImageKit from "@/helper/imageKitAuthanticator";
import { is } from "zod/v4/locales";
import AddProductHightlight from "./AddProductHightlight";
import AddProductNurtition from "./AddProductNurtition";
import AddProductBenefits from "./AddProductBenefits";

interface EditDialogProps {
  dialogCloseHandler: (value: React.SetStateAction<boolean>) => void;
  product: Product;
}

const BenefitSchema = z.object({
  id: z.string(),
  topic: z.string().min(1, { message: "Topic is required" }),
  description: z.string().min(1, { message: "Description is required" }),
});

const NutritionSchema = z.object({
  id: z.string(),
  nutrition: z.string().min(1, { message: "Nutrition name is required" }),
  quantity: z.string().optional(),
});

const ProductSchema = z.object({
  title: z.string().min(1, { message: "Product name is required" }),
  description: z.string().min(1, { message: "Description is required" }),
  price: z.number().min(0, { message: "Price cannot be 0" }),
  discountPercentage: z.number().min(0).optional(),
  stock: z.number().min(0, { message: "Stock cannot be negative" }),
  category: z.string().min(1, { message: "Category is required" }),
  flavor: z.string().optional(),
  weight: z.string({ message: "Weight is required" }),
  keyBenefits: z
    .array(BenefitSchema)
    .min(1, { message: "At least one key benefit is required" }),
  productHighlights: z
    .array(
      z.object({
        value: z.string().min(1, { message: "Highlight is required" }),
      })
    )
    .optional(),
  nutritionInformation: z
    .array(NutritionSchema)
    .min(1, { message: "At least one nutrition item is required" }),
});

function EditDialog({ dialogCloseHandler, product }: EditDialogProps) {
  const dispatch = useDispatch();

  const [isPending, startTransition] = useTransition();

  const [isDelectingImage, startDelectingImage] = useTransition();

  const [isDeleteProductBenefit, startDelectingProductBenefit] =
    useTransition();

  const [isDeletingNutrition, startDeletingNutrition] = useTransition();
  const [isDeletingHighlight, startDeletingHighlight] = useTransition();
  const [isAddingImage, startAddingImage] = useTransition();
  const [isAddingHighlightCompo, setIsAddingHighlightCompo] = useState(false);
  const [isAddingBenefitCompo, setIsAddingBenefitCompo] = useState(false);
  const [isAddingNutritionCompo, setIsAddingNutritionCompo] = useState(false);

  const isAnySubActionLoading =
    isDelectingImage ||
    isDeleteProductBenefit ||
    isDeletingNutrition ||
    isDeletingHighlight;

  const [isDeleteDialogCompo, setIsDeleteDialogCompo] = useState(false);
  const [isAddImageCompo, setIsAddImageCompo] = useState(false);

  // State for managing existing and new images
  const [files, setFiles] = useState<FileWithPreview[]>(
    product.productImages.map((img) => ({
      id: img.id,
      preview: img.url,
      imageKitId: img.imageKitId,
      name: "existing-image",
      size: 0,
      type: "image",
      progress: 100,
    }))
  );
  const [newFiles, setNewFiles] = useState<FileWithPreview[]>([]);

  const [deleteAction, setDeleteAction] = useState<{
    onConfirm: () => void;
    message: string;
  } | null>(null);

  const { productCategories, productFlavors, products } = useSelector(
    (state: RootState) => state.dataSlice
  );

  const category = productCategories.find(
    (cat: any) => cat.id === product.categoryId
  );
  const flavor = productFlavors.find((fav: any) => fav.id === product.flavorId);

  const form = useForm<z.infer<typeof ProductSchema>>({
    resolver: zodResolver(ProductSchema),
    defaultValues: {
      title: product.title,
      description: product.description,
      price: product.price,
      discountPercentage: product.discountPercentage,
      stock: product.stock,
      category: category?.category || "",
      flavor: flavor?.flavor || "",
      weight: product.weight,
      keyBenefits: product.benifits.length
        ? product.benifits
        : [{ id: crypto.randomUUID(), topic: "", description: "" }],
      productHighlights: product.productHighlights.length
        ? product.productHighlights.map((h) => ({ value: h }))
        : [{ value: "" }],
      nutritionInformation: product.nutrition.length
        ? product.nutrition
        : [{ id: crypto.randomUUID(), nutrition: "", quantity: "" }],
    },
  });

  /**
   * Opens a confirmation dialog before executing a delete action.
   * @param onConfirm - The function to execute if the user confirms.
   * @param message - The confirmation message to display to the user.
   */
  const openConfirmationDialog = (onConfirm: () => void, message: string) => {
    setDeleteAction({ onConfirm, message });
    setIsDeleteDialogCompo(true);
  };

  /**
   * Handles the deletion of a product image.
   * It sends a request to the backend to delete the image from the storage and database.
   * On success, it updates the local Redux state to reflect the change.
   * @param {FileWithPreview} fileToDelete - The image file object to be deleted.
   */
  const handleImageDelete = (fileToDelete: FileWithPreview) => {
    startDelectingImage(async () => {
      try {
        const res = await axios.post("/api/Products/delete-product-image", {
          imageKitId: fileToDelete.imageKitId,
          imageId: fileToDelete.id,
        });
        const { success, message } = res.data;

        if (success) {
          toast.success(message || "Image deleted successfully!", {
            style: { background: "hsl(142.1 76.2% 36.3%)", color: "white" },
          });
          // Optimistically update the UI by removing the image from the product's image list
          const updatedProductImages = product.productImages.filter(
            (image_info: ProductImages) => image_info.id !== fileToDelete.id
          );

          const updatedProducts = products.map((p) =>
            p.id === product.id
              ? { ...p, productImages: updatedProductImages }
              : p
          ) as Product[];
          setFiles(() => {
            return updatedProductImages.map((img) => ({
              id: img.id,
              preview: img.url,
              imageKitId: img.imageKitId,
              name: "existing-image",
              size: 0,
              type: "image",
              progress: 100,
            }));
          });
          dispatch(setProducts(updatedProducts));
        } else {
          toast.error(message || "Failed to delete image.", {
            style: { background: "hsl(0 84.2% 60.2%)", color: "white" },
          });
        }
      } catch (error) {
        console.error("Error deleting product image:", error);
        toast.error("An unexpected error occurred while deleting the image.", {
          style: { background: "hsl(0 84.2% 60.2%)", color: "white" },
        });
      }
    });
  };

  /**
   * Handles the deletion of a product benefit.
   * It calls the API to remove the benefit and then updates the Redux state.
   * @param {string} benefitId - The ID of the benefit to delete.
   */
  const handleDeletProductBenefit = (benefitId: string) => {
    startDelectingProductBenefit(async () => {
      try {
        const res = await axios.post("/api/Products/delete-product-benefit", {
          benefitId,
        });
        const { success, message } = res.data;
        if (success) {
          toast.success(message || "Benefit deleted successfully!", {
            style: { background: "hsl(142.1 76.2% 36.3%)", color: "white" },
          });
          const updatedKeyBenefits = product.benifits.filter(
            (benefit: Benefit) => benefit.id !== benefitId
          );
          const updatedProducts = products.map((p) =>
            p.id === product.id ? { ...p, benifits: updatedKeyBenefits } : p
          );
          dispatch(setProducts(updatedProducts));
        } else {
          toast.error(message || "Failed to delete benefit.", {
            style: { background: "hsl(0 84.2% 60.2%)", color: "white" },
          });
        }
      } catch (error) {
        console.error("Error deleting product benefit:", error);
        toast.error(
          "An unexpected error occurred while deleting the benefit.",
          {
            style: { background: "hsl(0 84.2% 60.2%)", color: "white" },
          }
        );
      }
    });
  };

  /**
   * Handles the deletion of a product's nutrition information.
   * It calls the API to remove the nutrition entry and then updates the Redux state.
   * @param {string} nutritionId - The ID of the nutrition entry to delete.
   */
  const handleDeleteProductNutrition = (nutritionId: string) => {
    startDeletingNutrition(async () => {
      try {
        const res = await axios.post("/api/Products/delete-product-nutriton", {
          nutritionId,
        });
        const { success, message } = res.data;

        if (success) {
          toast.success(message || "Nutrition info deleted successfully!", {
            style: { background: "hsl(142.1 76.2% 36.3%)", color: "white" },
          });
          const updatedNutrition = product.nutrition.filter(
            (nutrition: Nutrition) => nutrition.id !== nutritionId
          );
          const updatedProducts = products.map((p) =>
            p.id === product.id ? { ...p, nutrition: updatedNutrition } : p
          );
          dispatch(setProducts(updatedProducts));
        } else {
          toast.error(message || "Failed to delete nutrition info.", {
            style: { background: "hsl(0 84.2% 60.2%)", color: "white" },
          });
        }
      } catch (error) {
        console.error("Error deleting product nutrition:", error);
        toast.error(
          "An unexpected error occurred while deleting nutrition info.",
          { style: { background: "hsl(0 84.2% 60.2%)", color: "white" } }
        );
      }
    });
  };

  /**
   * Handles the deletion of a product highlight.
   * It calls the API to remove the highlight string and then updates the Redux state.
   * @param {string} highlight - The highlight string to delete.
   */
  const handleDeleteProductHig = (highlight: string) => {
    startDeletingHighlight(async () => {
      try {
        const res = await axios.post("/api/Products/delete-product-highlight", {
          productId: product.id,
          highlight,
        });
        const { success, message } = res.data;

        if (success) {
          toast.success(message || "Highlight deleted successfully!", {
            style: { background: "hsl(142.1 76.2% 36.3%)", color: "white" },
          });
          const updatedProducts = products.map((p) =>
            p.id === product.id
              ? {
                  ...p,
                  productHighlights: p.productHighlights.filter(
                    (h) => h !== highlight
                  ),
                }
              : p
          );
          dispatch(setProducts(updatedProducts));
        } else {
          toast.error(message || "Failed to delete highlight.", {
            style: { background: "hsl(0 84.2% 60.2%)", color: "white" },
          });
        }
      } catch (error) {
        console.error("Error deleting product highlight:", error);
        toast.error(
          "An unexpected error occurred while deleting the highlight.",
          { style: { background: "hsl(0 84.2% 60.2%)", color: "white" } }
        );
      }
    });
  };

  const addProductImage = () => {
    startAddingImage(async () => {
      try {
        // ✅ 1. Upload new images to ImageKit
        const imageUrls = await uploadToImageKit(newFiles);
        const filteredUrls = imageUrls.filter((url) => url !== null);

        if (filteredUrls.length === 0) {
          toast.error("No valid images to upload.", {
            style: { background: "hsl(0 84.2% 60.2%)", color: "white" },
          });
          return;
        }

        // ✅ 2. Send API request to add images to product
        const res = await axios.post("/api/Products/add-product-images", {
          productId: product.id,
          productImages: filteredUrls,
        });

        const { success, message, data } = res.data;

        // ✅ 3. Handle failed API response
        if (!success) {
          toast.error(`${message || "Failed to add product images."}`, {
            style: { background: "hsl(0 84.2% 60.2%)", color: "white" },
          });
          return;
        }

        // ✅ 4. Update state with new images
        const updatedProducts = products.map((p) =>
          p.id === product.id
            ? { ...p, productImages: [...(p.productImages || []), ...data] }
            : p
        );
        dispatch(setProducts(updatedProducts));

        // ✅ 5. Update UI state
        setFiles((prev) => [
          ...prev,
          ...data.map((imgInfo: ProductImages) => ({
            id: imgInfo.id,
            preview: imgInfo.url,
            imageKitId: imgInfo.imageKitId,
            name: "existing-image",
            size: 0,
            type: "image",
            progress: 100,
          })),
        ]);
        setNewFiles([]);
        setIsAddImageCompo(false);

        // ✅ 6. Success toast (green)
        toast.success(`${message || "Images added successfully."}`, {
          style: { background: "hsl(142.1 76.2% 36.3%)", color: "white" },
        });
      } catch (error: any) {
        // ❌ Handle unexpected errors
        console.error("❌ Error adding product images:", error);
        toast.error("Something went wrong while adding product images.", {
          style: { background: "hsl(0 84.2% 60.2%)", color: "white" },
        });
      }
    });
  };

  const updateProduct = (values: z.infer<typeof ProductSchema>) => {
    const {
      title,
      description,
      stock,
      price,
      discountPercentage,
      weight,
      category,
      flavor,
    } = values;
    startTransition(async () => {
      try {
        const categoryId = productCategories.find(
          (cat) => cat.category === category
        )?.id;
        const flavorId = productFlavors.find(
          (fav) => fav.flavor === flavor
        )?.id;

        const req = await axios.post("/api/Products/update-product", {
          productId: product.id,
          title,
          description,
          price,
          discountPercentage,
          stock,
          categoryId,
          flavorId,
          weight,
        });
        const { success, message } = req.data;
        if (success) {
          const updatedProduct = {
            ...product,
            title,
            description,
            price: Number(price),
            discountPercentage: Number(discountPercentage),
            stock: Number(stock),
            categoryId: categoryId as string,
            flavorId: flavorId as string,
            weight,
          };
          // Update product in Redux store
          const updatedProducts = products.map((p) =>
            p.id === product.id ? updatedProduct : p
          );
          dispatch(setProducts(updatedProducts));
          toast.success("Product updated successfully!");
          dialogCloseHandler(false);
        } else {
          toast.error(message || "Failed to update product.");
        }
      } catch (error) {
        console.error("Error updating product:", error);
        toast.error("An unexpected error occurred.");
      }
    });
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-3xl font-semibold text-gray-900 mb-6">
        Edit Product
      </h1>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(updateProduct, (errors: any) => {
            console.log("Validation errors:", errors);
          })}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Name */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter product name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        rows={4}
                        placeholder="Enter product description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Image Upload */}
              <div>
                <Label>Product Images</Label>
                <div className="mt-2 flex flex-wrap gap-4 items-center">
                  {files.map((file) => (
                    <div key={file.id} className="relative group">
                      <Image
                        src={file.preview}
                        alt="Product preview"
                        className="h-24 w-24 object-cover rounded-md border"
                        width={96}
                        height={96}
                      />
                      <button
                        type="button"
                        className="absolute top-0 right-0 cursor-pointer bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() =>
                          openConfirmationDialog(
                            () => handleImageDelete(file),
                            "Are you sure you want to delete this image?"
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <div
                    className="h-24 w-24 flex items-center justify-center border-2 border-dashed rounded-md cursor-pointer hover:bg-gray-50"
                    onClick={() => setIsAddImageCompo(true)}
                  >
                    <Plus className="h-8 w-8 text-gray-400" />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Click the &apos;+&apos; to add new images.
                </p>
              </div>

              {/* --- Category, Flavor, Weight --- */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            {field.value || "Select Category"}
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {productCategories.map((cat: ProductCategory) => (
                            <SelectItem key={cat.id} value={cat.category}>
                              {cat.category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="flavor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flavor</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            {field.value || "Select Flavor"}
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {productFlavors.map((flav: ProductFlavor) => (
                            <SelectItem key={flav.id} value={flav.flavor}>
                              {flav.flavor}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 2 lbs, 1 kg" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* --- Pricing & Inventory --- */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing & Inventory</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>₹ Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discountPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* --- Key Benefits --- */}

          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Key Benefits
                <Button
                  type="button"
                  onClick={() => setIsAddingBenefitCompo(true)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Benefit
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.benifits.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`keyBenefits.${index}.topic`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <Input
                          placeholder="Benefit topic"
                          {...field}
                          disabled
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`keyBenefits.${index}.description`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <Textarea
                          placeholder="Benefit description"
                          {...field}
                          disabled
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {product.benifits.length > 0 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() =>
                        openConfirmationDialog(
                          () => handleDeletProductBenefit(field.id),
                          "Are you sure you want to delete this benefit?"
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Nurtrition Information */}

          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Nutrition Information
                <Button
                  type="button"
                  onClick={() => setIsAddingNutritionCompo(true)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Nurtition Information
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.nutrition.map((field, index) => (
                <div key={field.id} className="flex items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`nutritionInformation.${index}.nutrition`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <Input placeholder="Nutrition..." {...field} disabled />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`nutritionInformation.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <Input placeholder="Quantity..." {...field} disabled />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {product.nutrition.length > 0 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() =>
                        openConfirmationDialog(
                          () => handleDeleteProductNutrition(field.id),
                          "Are you sure you want to delete this nutrition info?"
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Product Highlight */}

          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Product Highlights
                <Button
                  type="button"
                  onClick={() => setIsAddingHighlightCompo(true)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Highlight
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.productHighlights.map((field, index) => (
                <div key={field} className="flex items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`productHighlights.${index}.value`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <Input
                          placeholder="product highlight..."
                          {...field}
                          disabled
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {product.productHighlights.length > 0 && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      onClick={() =>
                        openConfirmationDialog(
                          () => handleDeleteProductHig(field),
                          "Are you sure you want to delete this highlight?"
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* --- Submit Button --- */}
          <div className="flex justify-end gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => dialogCloseHandler(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-red-800 hover:bg-red-900 text-white"
              disabled={isPending}
            >
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
      {/* deleting items from the product details */}
      <DialogCompo
        isOpen={isDeleteDialogCompo}
        onOpenChange={() => setIsDeleteDialogCompo(false)}
      >
        <ConfirmDeleteCompo
          isLoading={isAnySubActionLoading}
          message={deleteAction?.message}
          onClose={() => {
            setIsDeleteDialogCompo(false);
            setDeleteAction(null);
          }}
          deleteHandler={() => {
            deleteAction?.onConfirm();
            setIsDeleteDialogCompo(false);
          }}
        />
      </DialogCompo>
      {/* adding product images */}
      <DialogCompo
        isOpen={isAddImageCompo}
        onOpenChange={() => setIsAddImageCompo((prev: boolean) => !prev)}
        className="sm:max-w-4xl h-[90vh] overflow-y-auto"
      >
        <div className="p-4 md:p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Upload More Product Images
          </h2>

          <UploadImage files={newFiles} setFiles={setNewFiles} />

          {newFiles.length > 0 && (
            <Button
              className="w-full h-10 bg-red-900 hover:bg-red-800 cursor-pointer"
              onClick={addProductImage}
            >
              {isAddingImage && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isAddingImage ? (
                "Adding..."
              ) : (
                <div className="flex gap-3 items-center justify-center">
                  <Plus /> <h2>Add Images</h2>
                </div>
              )}
            </Button>
          )}
        </div>
      </DialogCompo>
      {/* add Product Highlight */}

      <DialogCompo
        isOpen={isAddingHighlightCompo}
        onOpenChange={() => setIsAddingHighlightCompo((prev: boolean) => !prev)}
      >
        <AddProductHightlight
          product={product}
          onClose={() => setIsAddingHighlightCompo((prev: boolean) => !prev)}
        />
      </DialogCompo>

      {/* add product Nutrition information */}
      <DialogCompo
        isOpen={isAddingNutritionCompo}
        onOpenChange={() => setIsAddingNutritionCompo((prev: boolean) => !prev)}
      >
        <AddProductNurtition
          product={product}
          onClose={() => setIsAddingNutritionCompo((prev: boolean) => !prev)}
        />
      </DialogCompo>

      {/* Adding Product Benifits */}

      <DialogCompo
        isOpen={isAddingBenefitCompo}
        onOpenChange={() => setIsAddingBenefitCompo((prev: boolean) => !prev)}
      >
        <AddProductBenefits
          product={product}
          onClose={() => setIsAddingBenefitCompo((prev: boolean) => !prev)}
        />
      </DialogCompo>
    </div>
  );
}

export default EditDialog;
