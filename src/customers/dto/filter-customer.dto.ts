import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class FilterCustomerDto {
    @IsUUID()
    @IsNotEmpty()
    laboratory: string;

    @IsString()
    @IsNotEmpty()
    cus_document_number: string;
}