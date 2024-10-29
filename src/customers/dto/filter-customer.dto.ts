import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class FilterCustomerDto {

    @IsUUID()
    @IsNotEmpty()
    cus_companie: string;

    @IsString()
    @IsNotEmpty()
    cus_numero_doc: string
}