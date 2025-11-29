/**
 * Common types for server action responses.
 * Use these types for consistent action return values.
 *
 * @module lib/action-types
 * @see MODULES.md for full documentation
 */

/**
 * Result type for actions that perform mutations (create, update, delete).
 * Either succeeds with optional data, or fails with an error message.
 *
 * @typeParam T - The type of data returned on success (optional)
 *
 * @example
 * // Action that returns no data on success
 * async function deleteItem(): Promise<ActionResult> {
 *   // ... delete logic
 *   return { success: true };
 * }
 *
 * @example
 * // Action that returns created item on success
 * async function createItem(): Promise<ActionResult<Item>> {
 *   // ... create logic
 *   return { success: true, data: newItem };
 * }
 */
export type ActionResult<T = void> =
  | { success: true; data?: T; error?: never }
  | { success?: never; data?: never; error: string };

/**
 * Result type for actions that fetch data.
 * Either succeeds with data, or fails with an error message.
 *
 * @typeParam T - The type of data returned on success
 *
 * @example
 * async function getItems(): Promise<DataResult<Item[]>> {
 *   // ... fetch logic
 *   return { data: items };
 * }
 *
 * @example
 * // Handling errors
 * async function getItem(id: string): Promise<DataResult<Item>> {
 *   if (!id) return { error: 'ID is required' };
 *   // ... fetch logic
 *   return { data: item };
 * }
 */
export type DataResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: string };

/**
 * Result type for form submissions.
 * Can indicate success, return an error, or both.
 * Useful for forms that need to close dialogs on success.
 *
 * @example
 * async function submitForm(formData: FormData): Promise<FormResult> {
 *   // ... validation and submission
 *   if (validationError) {
 *     return { error: 'Invalid input' };
 *   }
 *   return { success: true };
 * }
 */
export type FormResult = {
  success?: boolean;
  error?: string;
};

/**
 * Helper to create a success result for actions.
 *
 * @param data - Optional data to include
 * @returns ActionResult indicating success
 *
 * @example
 * return success(); // { success: true }
 * return success(newItem); // { success: true, data: newItem }
 */
export function success<T>(data?: T): ActionResult<T> {
  return data !== undefined ? { success: true, data } : { success: true };
}

/**
 * Helper to create an error result for actions.
 *
 * @param message - The error message
 * @returns ActionResult or DataResult indicating failure
 *
 * @example
 * return error('Invalid input');
 * return error('Not found');
 */
export function error(message: string): { error: string } {
  return { error: message };
}
