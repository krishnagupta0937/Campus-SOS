import { Controller, Get, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../../common/decorators';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Personnel directory — Admin and Coordinators only; no students.
   * GET /directory
   */
  @Get('directory')
  @Roles('CAMPUS_ADMIN')
  async getDirectory(
    @Query('team') team?: string,
    @Query('role') role?: string,
    @Query('availability') availability?: string,
    @Query('q') q?: string,
  ) {
    return this.usersService.getDirectory({ team, role, availability, q });
  }
}
