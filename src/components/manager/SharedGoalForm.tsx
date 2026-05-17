"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UomType } from "@prisma/client";
import { sharedGoalSchema, SharedGoalFormData } from "@/lib/validators/shared-goal";
import { FormWrapper } from "@/components/shared/form-wrapper";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";

interface SharedGoalFormProps {
  initialData?: Partial<SharedGoalFormData>;
  onSubmit: (data: SharedGoalFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  title?: string;
  description?: string;
}

export function SharedGoalForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  title = "Create Shared Goal",
  description = "Define a departmental KPI that can be assigned to multiple team members.",
}: SharedGoalFormProps) {
  const form = useForm<SharedGoalFormData>({
    resolver: zodResolver(sharedGoalSchema),
    defaultValues: {
      thrustArea: initialData?.thrustArea || "",
      title: initialData?.title || "",
      description: initialData?.description || "",
      uomType: initialData?.uomType || UomType.NUMERIC_MAX,
      target: initialData?.target || 0,
    },
  });

  const selectedUomType = form.watch("uomType");

  const onFormSubmit: SubmitHandler<SharedGoalFormData> = (data) => {
    onSubmit(data);
  };

  return (
    <FormWrapper
      title={title}
      description={description}
      onSubmit={form.handleSubmit(onFormSubmit)}
      onCancel={onCancel}
      isLoading={isLoading}
      submitLabel={initialData ? "Update Shared Goal" : "Create Shared Goal"}
    >
      <div className="grid gap-4">
        {/* Thrust Area */}
        <div className="space-y-2">
          <Label htmlFor="thrustArea">Thrust Area</Label>
          <Input
            id="thrustArea"
            placeholder="e.g., Departmental KPI"
            {...form.register("thrustArea")}
            className={form.formState.errors.thrustArea ? "border-red-500" : ""}
          />
          {form.formState.errors.thrustArea && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {form.formState.errors.thrustArea.message}
            </p>
          )}
        </div>

        {/* Goal Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Goal Title</Label>
          <Input
            id="title"
            placeholder="e.g., Regional Sales Target"
            {...form.register("title")}
            className={form.formState.errors.title ? "border-red-500" : ""}
          />
          {form.formState.errors.title && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {form.formState.errors.title.message}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Description (Optional)</Label>
          <Textarea
            id="description"
            placeholder="Provide context for this departmental goal..."
            {...form.register("description")}
            className={form.formState.errors.description ? "border-red-500" : ""}
          />
          {form.formState.errors.description && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {form.formState.errors.description.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* UoM Type */}
          <div className="space-y-2">
            <Label htmlFor="uomType">UoM Type</Label>
            <Select
              value={selectedUomType}
              onValueChange={(value) => form.setValue("uomType", value as UomType)}
            >
              <SelectTrigger id="uomType" className={form.formState.errors.uomType ? "border-red-500" : ""}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UomType.NUMERIC_MAX}>Numeric Max (Higher is better)</SelectItem>
                <SelectItem value={UomType.NUMERIC_MIN}>Numeric Min (Lower is better)</SelectItem>
                <SelectItem value={UomType.TIMELINE}>Timeline (Completion date)</SelectItem>
                <SelectItem value={UomType.ZERO_BASED}>Zero Based (Binary/Event)</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.uomType && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {form.formState.errors.uomType.message}
              </p>
            )}
          </div>

          {/* Target */}
          <div className="space-y-2">
            <Label htmlFor="target">Global Target Value</Label>
            <Input
              id="target"
              type="number"
              step="0.01"
              {...form.register("target", { valueAsNumber: true })}
              className={form.formState.errors.target ? "border-red-500" : ""}
            />
            {form.formState.errors.target && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {form.formState.errors.target.message}
              </p>
            )}
          </div>
        </div>
      </div>
    </FormWrapper>
  );
}
