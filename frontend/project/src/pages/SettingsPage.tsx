import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Smartphone, Bell } from 'lucide-react';
import NotificationSettings from '@/components/NotificationSettings';

export const SettingsPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <Settings className="h-8 w-8" />
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-gray-600">Manage your application preferences</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Notification Settings */}
        <div className="md:col-span-2">
          <NotificationSettings />
        </div>

        {/* PWA Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5" />
              <CardTitle>Mobile App</CardTitle>
            </div>
            <CardDescription>
              Progressive Web App features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <div className="text-sm text-green-800">
                ✅ <strong>Offline Access</strong>
                <br />
                You can use the app without internet connection
              </div>
            </div>
            
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="text-sm text-blue-800">
                📱 <strong>Home Screen Shortcut</strong>
                <br />
                You can add the app to your phone's home screen
              </div>
            </div>
            
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
              <div className="text-sm text-purple-800">
                ⚡ <strong>Fast Loading</strong>
                <br />
                Fast performance with advanced caching
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Info */}
        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>App Information</CardTitle>
            <CardDescription>
              About Zenith Trader
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <div>
                <strong>Version:</strong> 1.0.0-beta
              </div>
              <div>
                <strong>Last Update:</strong> {new Date().toLocaleDateString('en-US')}
              </div>
              <div>
                <strong>Platform:</strong> Progressive Web App
              </div>
            </div>
            
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-sm text-gray-600">
                🚀 <strong>Beta Version</strong>
                <br />
                You are using the test version of this app.
                Your feedback is valuable!
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Types Info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notification Types</CardTitle>
            </div>
            <CardDescription>
              When you will receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <div className="text-center">
                  <div className="text-2xl mb-2">🟢</div>
                  <div className="font-semibold text-green-800">Position Opening</div>
                  <div className="text-sm text-green-600 mt-1">
                    When the trader you follow opens a new position
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                <div className="text-center">
                  <div className="text-2xl mb-2">🟡</div>
                  <div className="font-semibold text-yellow-800">Partial Closure</div>
                  <div className="text-sm text-yellow-600 mt-1">
                    When a portion of the position is closed for profit realization
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <div className="text-center">
                  <div className="text-2xl mb-2">🔴</div>
                  <div className="font-semibold text-red-800">Position Closure</div>
                  <div className="text-sm text-red-600 mt-1">
                    When the position is completely closed (profit/loss realization)
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SettingsPage;
