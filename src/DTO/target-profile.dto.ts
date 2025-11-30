import { ApiProperty } from '@nestjs/swagger';

export class TargetProfileDto {
    @ApiProperty()
    firstName: string;

    @ApiProperty()
    lastName: string;

    @ApiProperty()
    displayName: string;

    @ApiProperty()
    age: number;

    @ApiProperty()
    gender: string;

    @ApiProperty()
    bio: string;

    @ApiProperty({ type: [String] })
    interests: string[];

    @ApiProperty()
    city: string;

    @ApiProperty()
    occupation: string;

    @ApiProperty()
    height: number;
}
