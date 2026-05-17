"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { UomType } from "@prisma/client";
import { goalSchema, GoalFormData } from "@/lib/validators/goal";
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

interface GoalFormProps {
  initialData?: Partial<GoalFormData>;
  onSubmit: (data: GoalFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  isShared?: boolean;
  title?: string;
  description?: string;
}

export function GoalForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
  isShared,
  title = "Create New Goal",
  description = "Define a new performance goal for this cycle.",
}: GoalFormProps) {
  const form = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      thrustArea: initialData?.thrustArea || "",
      title: initialData?.title || "",
      description: initialData?.description || "",
      uomType: initialData?.uomType || UomType.NUMERIC_MAX,
      target: initialData?.target || 0,
      weightage: initialData?.weightage || 10,
    },
  });

  const selectedUomType = form.watch("uomType");

  const onFormSubmit: SubmitHandler<GoalFormData> = (data) => {
    onSubmit(data);
  };

  return (
    <FormWrapper
      title={title}
      description={description}
      onSubmit={form.handleSubmit(onFormSubmit)}
      onCancel={onCancel}
      isLoading={isLoading}
      submitLabel={initialData ? "Update Goal" : "Create Goal"}
    >
      <div className="grid gap-4">
        {/* Thrust Area */}
        <div className="space-y-2">
          <Label htmlFor="thrustArea">Thrust Area</Label>
          <Input
            id="thrustArea"
            placeholder="e.g., Operational Excellence"
            {...form.register("thrustArea")}
            disabled={isShared}
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
            placeholder="e.g., Reduce downtime by 15%"
            {...form.register("title")}
            disabled={isShared}
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
            placeholder="Provide more context about this goal..."
            {...form.register("description")}
            disabled={isShared}
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
              disabled={isShared}
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
            <Label htmlFor="target">Target Value</Label>
            <Input
              id="target"
              type="number"
              step="0.01"
              {...form.register("target", { valueAsNumber: true })}
              disabled={isShared}
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

        {/* Weightage */}
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="weightage">Weightage (%)</Label>
            <span className="text-xs font-medium text-neutral-500">Min 10%</span>
          </div>
          <Input
            id="weightage"
            type="number"
            {...form.register("weightage", { valueAsNumber: true })}
            className={form.formState.errors.weightage ? "border-red-500" : ""}
          />
          {form.formState.errors.weightage && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {form.formState.errors.weightage.message}
            </p>
          )}
        </div>
      </div>
    </FormWrapper>
  );
}

