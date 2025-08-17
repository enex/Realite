import { validatePhoneNumber } from "@/shared/validation/phone";
import { z } from "zod";

export class BudgetSMSService {
  private baseUrl = "https://api.budgetsms.net/sendsms";

  async sendSMS(phoneNumber: string, message: string): Promise<boolean> {
    try {
      // Validiere und standardisiere die Telefonnummer
      const validation = validatePhoneNumber(phoneNumber);
      if (!validation.isValid) {
        console.error("Invalid phone number:", validation.error);
        return false;
      }

      const params = new URLSearchParams(
        z.record(z.string(), z.string()).parse({
          username: process.env.BUDGETSMS_USERNAME,
          handle: process.env.BUDGETSMS_HANDLE,
          userid: process.env.BUDGETSMS_USER_ID,
          msg: message,
          from: process.env.BUDGETSMS_FROM,
          to: validation.standardizedNumber,
        })
      );

      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(`SMS sending failed: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error("Error sending SMS:", error);
      return false;
    }
  }
}

export const budgetSMS = new BudgetSMSService();
