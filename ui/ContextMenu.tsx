import { useState } from 'react';
import { NodeType } from '../types';
import { useGraphStore } from '../state/graphStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Form, // This 'Form' now correctly wraps react-hook-form's FormProvider
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "../components/ui/alert-dialog";
import { Label } from "../components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

// Dynamically generate enum schema based on actual NodeType values
const categoryValues = Object.values(NodeType) as [string, ...string[]];

const formSchema = z.object({
  label: z.string().min(1, "Label required"),
  category: z.enum(categoryValues),
});

interface Props {
  x: number;
  y: number;
  graphX: number;
  graphY: number;
  onClose: () => void;
  nodeId?: string;
}

export const ContextMenu = ({ x, y, graphX, graphY, onClose, nodeId }: Props) => {
  const { addNodeMinimal, deleteNode } = useGraphStore();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { label: "", category: NodeType.PERSON },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    // Force cast category to NodeType to satisfy TS strictness
    addNodeMinimal(values.category as NodeType, graphX, graphY, values.label);
    onClose();
  };

  // If right-clicked on an existing node
  if (nodeId) {
    return (
      <>
        <div
          className="absolute bg-endecja-paper border-2 border-endecja-gold shadow-xl rounded-sm p-1 z-50 font-serif text-sm w-40"
          style={{ left: x, top: y }}
        >
          <button
            onClick={() => setDeleteOpen(true)}
            className="w-full text-left px-3 py-2 hover:bg-red-50 hover:text-red-700 rounded transition-colors text-red-900 font-medium"
          >
            Delete Node
          </button>
        </div>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Node?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the node and all connected edges from the graph.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={onClose}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => { deleteNode(nodeId); onClose(); }} 
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // If right-clicked on empty stage (Create Node)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Entity</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Label / Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Roman Dmowski" {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(NodeType).map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.charAt(0).toUpperCase() + t.slice(1).toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" className="bg-endecja-ink text-white">Create Node</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};