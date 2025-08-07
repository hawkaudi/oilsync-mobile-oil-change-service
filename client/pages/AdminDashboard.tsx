import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Clock, 
  Users, 
  DollarSign, 
  TrendingUp, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  UserPlus
} from "lucide-react";
import { Link } from "react-router-dom";
import { Booking, Technician, AdminDashboardData, ApiResponse } from "@shared/api";

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // In a real app, this would be a single endpoint
      const [bookingsResponse, techniciansResponse] = await Promise.all([
        fetch('/api/bookings'),
        fetch('/api/technicians') // This endpoint doesn't exist yet, using mock data
      ]);

      const bookings: ApiResponse = await bookingsResponse.json();
      
      // Mock data for now
      const mockDashboardData: AdminDashboardData = {
        todayBookings: bookings.data?.slice(0, 3) || [],
        pendingBookings: bookings.data?.filter((b: Booking) => b.status === 'pending') || [],
        technicians: [
          {
            id: 'tech_1',
            firstName: 'John',
            lastName: 'Smith',
            email: 'john@oilsync.com',
            phone: '(555) 123-4567',
            status: 'active',
            specializations: ['Oil Change', 'Filter Replacement'],
            rating: 4.8,
            totalJobs: 156,
            createdAt: '2024-01-15T00:00:00Z',
            updatedAt: '2024-01-15T00:00:00Z'
          },
          {
            id: 'tech_2',
            firstName: 'Sarah',
            lastName: 'Johnson',
            email: 'sarah@oilsync.com',
            phone: '(555) 987-6543',
            status: 'busy',
            specializations: ['Oil Change', 'Maintenance'],
            rating: 4.9,
            totalJobs: 203,
            createdAt: '2024-01-10T00:00:00Z',
            updatedAt: '2024-01-15T00:00:00Z'
          }
        ],
        recentCustomers: [],
        stats: {
          totalBookings: bookings.data?.length || 0,
          completedToday: bookings.data?.filter((b: Booking) => 
            b.status === 'completed' && 
            new Date(b.completedDate || '').toDateString() === new Date().toDateString()
          ).length || 0,
          revenue: 1247.50,
          activeCustomers: 89
        }
      };

      setDashboardData(mockDashboardData);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string, technicianId?: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, technicianId }),
      });

      const result: ApiResponse = await response.json();

      if (result.success) {
        fetchDashboardData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to update booking:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTechnicianStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'busy': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link to="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
                <span className="text-xl font-bold text-gray-900">OilSync</span>
              </Link>
              <Badge variant="secondary">Admin Dashboard</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm">
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.stats.totalBookings}</div>
              <p className="text-xs text-muted-foreground">
                +12% from last month
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.stats.completedToday}</div>
              <p className="text-xs text-muted-foreground">
                +2 from yesterday
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue Today</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${dashboardData.stats.revenue}</div>
              <p className="text-xs text-muted-foreground">
                +8% from yesterday
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData.stats.activeCustomers}</div>
              <p className="text-xs text-muted-foreground">
                +5 new this week
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="bookings" className="space-y-6">
          <TabsList>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="technicians">Technicians</TabsTrigger>
            <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-6">
            {/* Pending Bookings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Pending Bookings
                  <Badge variant="outline">{dashboardData.pendingBookings.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Bookings awaiting technician assignment and confirmation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dashboardData.pendingBookings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pending bookings</p>
                ) : (
                  <div className="space-y-4">
                    {dashboardData.pendingBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <p className="font-medium">Booking #{booking.id.slice(-8)}</p>
                          <p className="text-sm text-muted-foreground">{booking.serviceAddress}</p>
                          <p className="text-sm text-muted-foreground">
                            Scheduled: {new Date(booking.scheduledDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                          <Select
                            onValueChange={(technicianId) => 
                              updateBookingStatus(booking.id, 'confirmed', technicianId)
                            }
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Assign tech" />
                            </SelectTrigger>
                            <SelectContent>
                              {dashboardData.technicians
                                .filter(tech => tech.status === 'active')
                                .map((tech) => (
                                  <SelectItem key={tech.id} value={tech.id}>
                                    {tech.firstName} {tech.lastName}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* All Bookings Table */}
            <Card>
              <CardHeader>
                <CardTitle>All Bookings</CardTitle>
                <CardDescription>Complete list of all bookings</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Technician</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.todayBookings.map((booking) => (
                      <TableRow key={booking.id}>
                        <TableCell className="font-medium">
                          #{booking.id.slice(-8)}
                        </TableCell>
                        <TableCell>{booking.customerId.slice(-8)}</TableCell>
                        <TableCell>{booking.vehicleId.slice(-8)}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {booking.serviceAddress}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {booking.technicianId ? 
                            booking.technicianId.slice(-8) : 
                            <span className="text-muted-foreground">Unassigned</span>
                          }
                        </TableCell>
                        <TableCell>${booking.price}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="technicians" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">Technicians</h2>
                <p className="text-muted-foreground">Manage your service technicians</p>
              </div>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Technician
              </Button>
            </div>

            <div className="grid gap-6">
              {dashboardData.technicians.map((technician) => (
                <Card key={technician.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{technician.firstName} {technician.lastName}</h3>
                          <p className="text-sm text-muted-foreground">{technician.email}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge className={getTechnicianStatusColor(technician.status)}>
                              {technician.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              ⭐ {technician.rating}/5.0
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {technician.totalJobs} jobs completed
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Specializations:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {technician.specializations.map((spec, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="vehicles" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Vehicle Management</h2>
              <p className="text-muted-foreground">Vehicle database and VIN decoder</p>
            </div>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Vehicle management features coming soon...</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
